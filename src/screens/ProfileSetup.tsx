import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { preparePhoto } from '../lib/image';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconCheck } from '../components/Icon';
import { categories } from '../data/categories';
import { BIO_MAX, gradYearRange, validateGradYear } from '../lib/profile';
import { friendlyError, useAppStore } from '../store/useAppStore';
import type { CategoryId, PhotoChange } from '../types';
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
  // Profile photo: a newly picked one (with a local preview), or "removed".
  const [avatar, setAvatar] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const shownAvatar = avatarPreview ?? (avatarRemoved ? null : (user?.avatarUrl ?? null));

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  async function pickAvatar(file: File | undefined) {
    if (!file) return;
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      const prepared = await preparePhoto(file, { square: true });
      setAvatar(prepared);
      setAvatarPreview(URL.createObjectURL(prepared));
      setAvatarRemoved(false);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Couldn't use that photo.");
    } finally {
      setAvatarBusy(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }

  function removeAvatar() {
    setAvatar(null);
    setAvatarPreview(null);
    setAvatarRemoved(true);
  }
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
      const avatarChange: PhotoChange = avatar
        ? { kind: 'replace', photo: avatar }
        : avatarRemoved
          ? { kind: 'remove' }
          : { kind: 'keep' };
      await updateProfile({
        name: name.trim(),
        gradYear: gradYear.year,
        major: major.trim() || undefined,
        bio: bio.trim() || undefined,
        interests,
      }, avatarChange);
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

      <div className="profile-setup__photo">
        <Avatar name={name || user?.name} url={shownAvatar} size={88} />
        <div className="profile-setup__photo-actions">
          <span className="profile-setup__label">
            Profile photo <span className="profile-setup__optional">(optional)</span>
          </span>
          <input
            ref={avatarInputRef}
            id="profile-photo-input"
            type="file"
            accept="image/*"
            className="profile-setup__photo-input"
            onChange={(e) => void pickAvatar(e.target.files?.[0])}
          />
          <div className="profile-setup__photo-buttons">
            <label htmlFor="profile-photo-input" className="btn btn--secondary btn--sm">
              {avatarBusy ? 'Preparing…' : shownAvatar ? 'Change photo' : 'Add photo'}
            </label>
            {shownAvatar && (
              <button type="button" className="profile-setup__photo-remove" onClick={removeAvatar}>
                Remove
              </button>
            )}
          </div>
          {avatarError && <span className="profile-setup__field-error">{avatarError}</span>}
        </div>
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
