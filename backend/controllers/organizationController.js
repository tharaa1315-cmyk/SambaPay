import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import JoinRequest from '../models/JoinRequest.js';
import User from '../models/User.js';
import { logAudit } from '../utils/audit.js';

const isValidId = (value) => mongoose.isValidObjectId(value);
const normalizeSlug = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sameId = (left, right) => String(left) === String(right);

const publicOrganization = (organization) => ({
  id: String(organization._id),
  name: organization.name,
  slug: organization.slug,
  ownerId: String(organization.ownerId),
  memberCount: Array.isArray(organization.members) ? organization.members.length : 0
});

const isOrganizationAdmin = (organization, userId) => (
  sameId(organization.ownerId, userId)
  || organization.members?.some((member) => sameId(member.userId, userId) && member.role === 'ADMIN')
);

export const searchOrganizations = async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const filter = search ? { $or: [{ name: { $regex: search, $options: 'i' } }, { slug: { $regex: search, $options: 'i' } }] } : {};
    const organizations = await Organization.find(filter).sort({ name: 1 }).limit(20);
    res.json(organizations.map(publicOrganization));
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const getMyOrganization = async (req, res) => {
  try {
    if (!req.user.organizationId) return res.json(null);
    const organization = await Organization.findById(req.user.organizationId);
    if (!organization) return res.json(null);
    res.json({ ...publicOrganization(organization), isAdmin: isOrganizationAdmin(organization, req.user.id) });
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const createOrganization = async (req, res) => {
  try {
    if (req.user.organizationId) return res.status(409).json({ message: 'You already belong to an organization' });
    const name = String(req.body.name || '').trim();
    const slug = normalizeSlug(req.body.slug || name);
    if (!name || !slug) return res.status(400).json({ message: 'Organization name is required' });

    const existing = await Organization.findOne({ slug });
    if (existing) return res.status(409).json({ message: 'That organization identifier is already in use' });

    const organization = await Organization.create({
      name,
      slug,
      ownerId: req.user.id,
      members: [{ userId: req.user.id, role: 'ADMIN' }]
    });
    const user = await User.findByIdAndUpdate(req.user.id, { organizationId: organization._id, role: 'ADMIN' }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await logAudit({ user: req.user, action: 'Created organization', module: 'organization', newValues: organization });
    res.status(201).json({ organization: publicOrganization(organization), user: { id: String(user._id), role: user.role, organizationId: user.organizationId } });
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ message: err.code === 11000 ? 'That organization identifier is already in use' : err.message });
  }
};

export const requestToJoin = async (req, res) => {
  try {
    if (req.user.organizationId) return res.status(409).json({ message: 'You already belong to an organization' });
    const organizationId = req.body.organizationId;
    if (!isValidId(organizationId)) return res.status(400).json({ message: 'A valid organization is required' });
    const organization = await Organization.findById(organizationId);
    if (!organization) return res.status(404).json({ message: 'Organization not found' });

    const existing = await JoinRequest.findOne({ organizationId, userId: req.user.id, status: 'PENDING' });
    if (existing) return res.status(409).json({ message: 'You already have a pending request for this organization' });
    const request = await JoinRequest.create({ organizationId, userId: req.user.id, message: req.body.message || '', status: 'PENDING' });
    res.status(201).json(request);
  } catch (err) {
    res.status(err.code === 11000 ? 409 : 400).json({ message: err.message });
  }
};

export const getJoinRequests = async (req, res) => {
  try {
    if (!req.user.organizationId) return res.json([]);
    const organization = await Organization.findById(req.user.organizationId);
    if (!organization || !isOrganizationAdmin(organization, req.user.id)) return res.status(403).json({ message: 'Only organization admins can view join requests' });
    const requests = await JoinRequest.find({ organizationId: organization._id, status: 'PENDING' }).sort({ createdAt: 1 });
    const users = await User.find({ _id: { $in: requests.map((request) => request.userId) } }).select('name email role');
    const byId = new Map(users.map((user) => [String(user._id), user]));
    res.json(requests.map((request) => ({ ...request.toObject(), user: byId.get(String(request.userId)) || null })));
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};

export const reviewJoinRequest = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid join request ID' });
    const organization = req.user.organizationId ? await Organization.findById(req.user.organizationId) : null;
    if (!organization || !isOrganizationAdmin(organization, req.user.id)) return res.status(403).json({ message: 'Only organization admins can review join requests' });
    const status = req.body.action === 'approve' ? 'APPROVED' : req.body.action === 'reject' ? 'REJECTED' : null;
    if (!status) return res.status(400).json({ message: 'Action must be approve or reject' });

    const request = await JoinRequest.findOneAndUpdate(
      { _id: req.params.id, organizationId: organization._id, status: 'PENDING' },
      { $set: { status, reviewedBy: req.user.id, reviewedAt: new Date() } },
      { new: true }
    );
    if (!request) return res.status(404).json({ message: 'Pending join request not found' });

    if (status === 'APPROVED') {
      await User.findByIdAndUpdate(request.userId, { organizationId: organization._id, role: 'EMPLOYEE' });
      await Organization.findByIdAndUpdate(organization._id, { $push: { members: { userId: request.userId, role: 'MEMBER' } } });
    }
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
  }
};
