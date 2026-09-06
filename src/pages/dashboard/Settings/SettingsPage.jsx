import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { authAPI, settingsAPI, organizationsAPI } from '../../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card/Card';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { Select } from '../../../components/ui/Select/Select';
import { Settings as SettingsIcon, Building, Briefcase, CreditCard, UserCog } from 'lucide-react';
import './SettingsPage.css';

export const SettingsPage = () => {
    const { role, user, updateCurrentUser } = useAuth();
    const { addNotification } = useNotification();
    const [settings, setSettings] = useState({ company: [], hr: [], payroll: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [roleSaving, setRoleSaving] = useState('');
    const [organization, setOrganization] = useState(null);
    const [organizationLoading, setOrganizationLoading] = useState(true);
    const [organizationName, setOrganizationName] = useState('');
    const [organizationSlug, setOrganizationSlug] = useState('');
    const [organizationSearch, setOrganizationSearch] = useState('');
    const [organizationResults, setOrganizationResults] = useState([]);
    const [organizationSaving, setOrganizationSaving] = useState(false);
    const [joinRequests, setJoinRequests] = useState([]);

    const canEditHR = ['ADMIN', 'HR_MANAGER'].includes(role);
    const canEditPayroll = ['ADMIN', 'HR_PAYROLL_MANAGER'].includes(role);
    const canEditCompany = ['ADMIN', 'HR_MANAGER'].includes(role);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await settingsAPI.getSettings();
                const grouped = { company: [], hr: [], payroll: [] };
                data.forEach(s => {
                    if (grouped[s.category]) {
                        grouped[s.category].push({ ...s, originalValue: s.value });
                    }
                });
                setSettings(grouped);
            } catch (err) {
                setError(err.message || 'Failed to load settings');
            } finally {
                setLoading(false);
            }
        };

        if (role !== 'EMPLOYEE') fetchSettings();
        else setLoading(false);
    }, [role]);

    useEffect(() => {
        const fetchOrganization = async () => {
            setOrganizationLoading(true);
            try {
                const currentOrganization = await organizationsAPI.getMine();
                setOrganization(currentOrganization);
                if (currentOrganization?.isAdmin) setJoinRequests(await organizationsAPI.getJoinRequests());
            } catch (err) {
                setError(err.message || 'Failed to load organization');
            } finally {
                setOrganizationLoading(false);
            }
        };
        fetchOrganization();
    }, [user?.organizationId]);

    const handleCreateOrganization = async (event) => {
        event.preventDefault();
        setOrganizationSaving(true);
        try {
            const result = await organizationsAPI.create({ name: organizationName, slug: organizationSlug });
            setOrganization(result.organization);
            updateCurrentUser(result.user);
            addNotification({ message: 'Organization created successfully', type: 'success' });
        } catch (err) {
            addNotification({ message: err.message || 'Failed to create organization', type: 'error' });
        } finally {
            setOrganizationSaving(false);
        }
    };

    const handleSearchOrganizations = async (event) => {
        event.preventDefault();
        try {
            setOrganizationResults(await organizationsAPI.search(organizationSearch));
        } catch (err) {
            addNotification({ message: err.message || 'Failed to search organizations', type: 'error' });
        }
    };

    const handleJoinRequest = async (organizationId) => {
        try {
            await organizationsAPI.requestToJoin({ organizationId });
            addNotification({ message: 'Join request sent to the organization admin', type: 'success' });
        } catch (err) {
            addNotification({ message: err.message || 'Failed to request access', type: 'error' });
        }
    };

    const handleReviewRequest = async (requestId, action) => {
        try {
            await organizationsAPI.reviewJoinRequest(requestId, action);
            setJoinRequests((requests) => requests.filter((request) => String(request._id) !== String(requestId)));
            addNotification({ message: action === 'approve' ? 'Member added to the organization' : 'Join request rejected', type: 'success' });
        } catch (err) {
            addNotification({ message: err.message || 'Failed to review join request', type: 'error' });
        }
    };

    useEffect(() => {
        if (role !== 'ADMIN') return;

        const fetchUsers = async () => {
            setUsersLoading(true);
            try {
                setUsers(await authAPI.getUsers());
            } catch (err) {
                addNotification({ message: err.message || 'Failed to load users', type: 'error' });
            } finally {
                setUsersLoading(false);
            }
        };

        fetchUsers();
    }, [role]);

    const handleRoleChange = async (userId, nextRole) => {
        setRoleSaving(userId);
        try {
            const updatedUser = await authAPI.updateUserRole(userId, nextRole);
            setUsers(currentUsers => currentUsers.map(user => user.id === userId ? updatedUser : user));
            addNotification({ message: 'User role updated successfully', type: 'success' });
        } catch (err) {
            addNotification({ message: err.message || 'Failed to update user role', type: 'error' });
        } finally {
            setRoleSaving('');
        }
    };

    const handleUpdate = (category, index, newValue) => {
        const newCategorySettings = [...settings[category]];
        newCategorySettings[index].value = newValue;
        setSettings({ ...settings, [category]: newCategorySettings });
    };

    const handleSave = async (category) => {
        setSaving(category);
        try {
            const updates = settings[category].filter(s => s.value !== s.originalValue);
            for (const setting of updates) {
                await settingsAPI.updateSetting({
                    category,
                    key: setting.key,
                    value: setting.value,
                    type: setting.type,
                });
            }

            const updatedSettings = { ...settings };
            updatedSettings[category] = updatedSettings[category].map(s => ({ ...s, originalValue: s.value }));
            setSettings(updatedSettings);

            addNotification({ message: 'Settings saved successfully', type: 'success' });
        } catch (err) {
            addNotification({ message: err.message || 'Failed to save settings', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="settings-page loading">Loading settings...</div>;

    return (
        <div className="settings-page">
            <div>
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">Manage organization and system preferences.</p>
            </div>

            {error && role !== 'EMPLOYEE' && <div className="settings-error">{error}</div>}
            <div className="settings-grid">
                    <Card className="organization-card">
                        <CardHeader>
                            <CardTitle><Building size={16} /> Organization</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {organizationLoading ? <p className="text-muted">Loading organization...</p> : organization ? (
                                <>
                                    <p><strong>{organization.name}</strong> <span className="text-muted">({organization.slug})</span></p>
                                    <p className="settings-card-helper">{organization.memberCount} member{organization.memberCount === 1 ? '' : 's'} · {organization.isAdmin ? 'You are the organization admin.' : 'Membership is active.'}</p>
                                    {organization.isAdmin && (
                                        <div className="user-role-list">
                                            <h3>Pending join requests</h3>
                                            {joinRequests.length === 0 ? <p className="text-muted">No pending requests.</p> : joinRequests.map((request) => (
                                                <div className="user-role-row" key={request._id}>
                                                    <div className="user-role-identity"><strong>{request.user?.name || 'Unknown user'}</strong><span>{request.user?.email}</span></div>
                                                    <div><Button onClick={() => handleReviewRequest(request._id, 'approve')}>Approve</Button><Button variant="ghost" onClick={() => handleReviewRequest(request._id, 'reject')}>Reject</Button></div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <p className="settings-card-helper">You are not in an organization yet. Create one to become its admin, or request to join an existing organization.</p>
                                    <form onSubmit={handleCreateOrganization} className="settings-list">
                                        <Input label="Organization name" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} required />
                                        <Input label="Organization identifier (optional)" value={organizationSlug} onChange={(event) => setOrganizationSlug(event.target.value)} placeholder="my-company" />
                                        <Button type="submit" loading={organizationSaving}>Create organization</Button>
                                    </form>
                                    <form onSubmit={handleSearchOrganizations} className="settings-list" style={{ marginTop: '1rem' }}>
                                        <Input label="Find an organization" value={organizationSearch} onChange={(event) => setOrganizationSearch(event.target.value)} placeholder="Search by name" />
                                        <Button type="submit" variant="secondary">Search</Button>
                                    </form>
                                    {organizationResults.map((result) => <div className="user-role-row" key={result.id}><div className="user-role-identity"><strong>{result.name}</strong><span>{result.slug} · {result.memberCount} members</span></div><Button onClick={() => handleJoinRequest(result.id)}>Request to join</Button></div>)}
                                </>
                            )}
                        </CardContent>
                    </Card>
                    {role !== 'EMPLOYEE' && <>
                    {role === 'ADMIN' && (
                        <Card className="user-roles-card">
                            <CardHeader>
                                <CardTitle><UserCog size={16} /> User roles</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="settings-card-helper">Assign access levels to every SambaPay user.</p>
                                {usersLoading ? <p className="text-muted">Loading users...</p> : (
                                    <div className="user-role-list">
                                        {users.map(user => (
                                            <div className="user-role-row" key={user.id}>
                                                <div className="user-role-identity">
                                                    <strong>{user.name}</strong>
                                                    <span>{user.email}</span>
                                                </div>
                                                <Select
                                                    aria-label={`Role for ${user.name}`}
                                                    value={user.role}
                                                    disabled={roleSaving === user.id || user.id === 'demo-admin'}
                                                    onChange={(event) => handleRoleChange(user.id, event.target.value)}
                                                    options={[
                                                        { value: 'ADMIN', label: 'Administrator' },
                                                        { value: 'HR_MANAGER', label: 'HR Manager' },
                                                        { value: 'HR_PAYROLL_USER', label: 'HR Payroll User' },
                                                        { value: 'HR_PAYROLL_MANAGER', label: 'HR Payroll Manager' },
                                                        { value: 'EMPLOYEE', label: 'Employee' }
                                                    ]}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                    {canEditCompany && (
                        <Card>
                            <CardHeader>
                                <CardTitle><Building size={16} /> Company Profile</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="settings-list">
                                    {settings.company.map((s, i) => (
                                        <div key={s.key} className="setting-item">
                                            <label>{s.key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>
                                            <Input
                                                type={s.type || 'text'}
                                                value={s.value}
                                                onChange={(e) => handleUpdate('company', i, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                    {settings.company.length === 0 && <p className="text-muted">No settings available.</p>}
                                    {settings.company.length > 0 && (
                                        <Button onClick={() => handleSave('company')} loading={saving === 'company'} className="mt-4">Save Company Settings</Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {canEditHR && (
                        <Card>
                            <CardHeader>
                                <CardTitle><Briefcase size={16} /> HR Preferences</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="settings-list">
                                    {settings.hr.map((s, i) => (
                                        <div key={s.key} className="setting-item">
                                            <label>{s.key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>
                                            <Input
                                                type={s.type || 'text'}
                                                value={s.value}
                                                onChange={(e) => handleUpdate('hr', i, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                    {settings.hr.length === 0 && <p className="text-muted">No settings available.</p>}
                                    {settings.hr.length > 0 && (
                                        <Button onClick={() => handleSave('hr')} loading={saving === 'hr'} className="mt-4">Save HR Settings</Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {canEditPayroll && (
                        <Card>
                            <CardHeader>
                                <CardTitle><CreditCard size={16} /> Payroll Settings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="settings-list">
                                    {settings.payroll.map((s, i) => (
                                        <div key={s.key} className="setting-item">
                                            <label>{s.key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>
                                            <Input
                                                type={s.type || 'text'}
                                                value={s.value}
                                                onChange={(e) => handleUpdate('payroll', i, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                    {settings.payroll.length === 0 && <p className="text-muted">No settings available.</p>}
                                    {settings.payroll.length > 0 && (
                                        <Button onClick={() => handleSave('payroll')} loading={saving === 'payroll'} className="mt-4">Save Payroll Settings</Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    </>}
                </div>
        </div>
    );
};
