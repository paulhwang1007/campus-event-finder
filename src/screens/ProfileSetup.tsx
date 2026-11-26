import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconCheck } from '../components/Icon';
import { categories } from '../data/categories';
import { BIO_MAX, gradYearRange, validateGradYear } from '../lib/profile';
import { friendlyError, useAppStore } from '../store/useAppStore';
import type { CategoryId } from '../types';
import './ProfileSetup.css';

interface Props {
  mode: 'onboarding' | 'edit';
}

export function ProfileSetup({ mode }: Props) {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const showToast = useAppStore((s) => s.showToast);

  const [name, setName] = useState(user?.name ?? '');
  const [gradYearText, setGradYearText] = useState(user?.gradYear ? String(user.gradYear) : '');
  const [gradYearTouched, setGradYearTouched] = useState(false);
  const [major, setMajor] = useState(user?.major ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [interests, setInterests] = useState<CategoryId[]>(user?.interests ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gradYear = validateGradYear(gradYearText, new Date());
  const { min: minYear, max: maxYear } = gradYearRange(new Date());
  const canSubmit = name.trim() !== '' && 'year' in gradYear && interests.length > 0 && !saving;
  const isEdit = mode === 'edit';

  function toggleInterest(id: CategoryId) {
    setInterests((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }

  async function handleSubmit() {
    if (!canSubmit || !('year' in gradYear)) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        name: name.trim(),
        gradYear: gradYear.year,
        major: major.trim() || undefined,
        bio: bio.trim() || undefined,
        interests,
      });
      if (isEdit) {
        showToast('Profile saved');
        navigate('/profile');
      }
      // In onboarding mode, App switches to the feed once the profile is marked onboarded.
    } catch (err) {
      console.error('Failed to save profile', err);
      setError(friendlyError(err));
      setSaving(false);
    }
  }

  return (
    <div className="screen profile-setup">
      {isEdit ? (
        <button type="button" className="profile-setup__back" onClick={() => navigate(-1)}>
          <IconArrowLeft /> Back
        </button>
      ) : null}

      <div className="profile-setup__intro">
        <h1 className="profile-setup__heading">{isEdit ? 'Edit profile' : 'Welcome! Tell us about you'}</h1>
        {!isEdit && (
          <p className="profile-setup__subtitle">This helps us show you events you'll actually want to go to.</p>
        )}
      </div>

      <label className="profile-setup__field">
        <span className="profile-setup__label">Name</span>
        <input
          className="profile-setup__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoComplete="name"
        />
      </label>

      <label className="profile-setup__field">
        <span className="profile-setup__label">Graduation year</span>
        <input
          className="profile-setup__input profile-setup__input--year"
          value={gradYearText}
          onChange={(e) => setGradYearText(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onBlur={() => setGradYearTouched(true)}
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 2028"
          aria-invalid={gradYearTouched && 'error' in gradYear}
          aria-describedby="grad-year-hint"
        />
        {gradYearTouched && 'error' in gradYear ? (
          <span id="grad-year-hint" className="profile-setup__field-error">
            {gradYear.error}
          </span>
        ) : (
          <span id="grad-year-hint" className="profile-setup__hint">
            The year you'll graduate ({minYear}–{maxYear}).
          </span>
        )}
      </label>

      <label className="profile-setup__field">
        <span className="profile-setup__label">
          Major <span className="profile-setup__optional">(optional)</span>
        </span>
        <input
          className="profile-setup__input"
          value={major}
          onChange={(e) => setMajor(e.target.value)}
          maxLength={60}
          placeholder="e.g. Info Sci"
        />
      </label>

      <label className="profile-setup__field">
        <span className="profile-setup__label">
          Bio <span className="profile-setup__optional">(optional)</span>
        </span>
        <textarea
          className="profile-setup__input profile-setup__textarea"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={BIO_MAX}
          rows={3}
          placeholder="e.g. Always down for pickup soccer or a late-night boba run"
        />
        <span className="profile-setup__hint profile-setup__count" aria-live="polite">
          {bio.length}/{BIO_MAX}
        </span>
      </label>

      <fieldset className="profile-setup__field">
        <legend className="profile-setup__label">What are you into?</legend>
        <p className="profile-setup__hint">Pick at least one. You'll still see other stuff too.</p>
        <div className="profile-setup__tiles">
          {categories.map((c) => {
            const selected = interests.includes(c.id);
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={selected}
                className={`profile-setup__tile${selected ? ' profile-setup__tile--active' : ''}`}
                onClick={() => toggleInterest(c.id)}
              >
                <Icon size={24} />
                <span>{c.label}</span>
                {selected && <IconCheck size={14} className="profile-setup__tile-check" />}
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && <p className="profile-setup__error">{error}</p>}

      <button type="button" className="profile-setup__submit" disabled={!canSubmit} onClick={handleSubmit}>
        {saving ? 'Saving…' : isEdit ? 'Save' : 'Start exploring'}
      </button>
    </div>
  );
}
