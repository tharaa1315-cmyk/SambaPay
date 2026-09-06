import React from 'react';
import { ArrowRight, Check, CircleDollarSign, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from '../../assets/hero.png';
import './Landing.css';

const features = [
  { icon: Clock3, title: 'People, in sync', text: 'Bring attendance, time off, and employee records into one calm workspace.' },
  { icon: CircleDollarSign, title: 'Payroll without the scramble', text: 'Move from approved hours to accurate payruns with a clear audit trail.' },
  { icon: ShieldCheck, title: 'Built for trust', text: 'Protect sensitive people data with role-based access and dependable controls.' }
];

export const Landing = () => {
  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Main navigation">
        <Link to="/" className="brand-lockup" aria-label="SambaPay home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>Samba<span>Pay</span></span>
        </Link>
        <div className="landing-nav__actions">
          <span className="landing-nav__hint">Already a customer?</span>
          <Link to="/login" className="landing-nav__login">Sign in</Link>
          <Link to="/signup" className="landing-nav__cta">Get started <ArrowRight size={16} /></Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero__copy">
          <div className="eyebrow"><Sparkles size={15} /> People-first payroll, beautifully simple</div>
          <h1>Make every payday feel <em>easy.</em></h1>
          <p className="landing-hero__subtitle">
            SambaPay gives growing teams one clear place to manage people, time, and payroll, so your best work stays focused on what matters.
          </p>
          <div className="landing-hero__actions">
            <Link to="/signup" className="landing-button landing-button--primary">Start for free <ArrowRight size={18} /></Link>
            <Link to="/login" className="landing-button landing-button--quiet">Explore the workspace</Link>
          </div>
          <div className="landing-proof"><span className="proof-dots"><i /><i /><i /></span> Trusted workflows for modern teams</div>
        </div>

        <div className="landing-hero__visual" aria-label="SambaPay payroll workspace preview">
          <div className="visual-glow" />
          <div className="visual-orbit visual-orbit--one" />
          <div className="visual-orbit visual-orbit--two" />
          <img src={heroImage} alt="Layered SambaPay platform mark" className="landing-hero__image" />
          <div className="floating-stat floating-stat--top"><span className="stat-dot" /> Payroll processed <strong>On time</strong></div>
          <div className="floating-stat floating-stat--bottom"><span className="stat-icon"><Check size={14} /></span><div><strong>98.4%</strong><small>team satisfaction</small></div></div>
        </div>
      </section>

      <section className="landing-features" aria-label="SambaPay benefits">
        <div className="landing-features__intro"><span>Everything aligned</span><h2>The work behind the work,<br />made lighter.</h2></div>
        <div className="landing-features__grid">
          {features.map(({ icon: Icon, title, text }) => (
            <article className="feature-item" key={title}>
              <div className="feature-item__icon"><Icon size={20} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer"><span className="brand-lockup brand-lockup--small"><span className="brand-mark" aria-hidden="true"><span /></span><span>Samba<span>Pay</span></span></span><span>Thoughtful tools for the people who make work happen.</span></footer>
    </main>
  );
};
