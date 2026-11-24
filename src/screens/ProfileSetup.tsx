import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconCheck } from '../components/Icon';
import { categories } from '../data/categories';
import { useAppStore } from '../store/useAppStore';
import type { CategoryId, ClassYear } from '../types';
import './ProfileSetup.css';

const CLASS_YEARS: ClassYear[] = ['First-year', 'Sophomore', 'Junior', 'Senior', 'Transfer'];

interface Props {
  mode: 'onboarding' | 'edit';
}

export function ProfileSetup({ mode }: Props) {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const showToast = useAppStore((s) => s.showToast);

  const [name, setName] = useState(user?.name ?? '');
  const [classYear, setClassYear] = useState<ClassYear | null>(user?.classYear ?? null);
  const [major, setMajor] = useState(user?.major ?? '');
  const [interests, setInterests] = useState<CategoryId[]>(user?.interests ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim() !== '' && classYear != null && interests.length > 0 && !saving;
  const isEdit = mode === 'edit';

  function toggleInterest(id: CategoryId) {
    setInterests((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }

  async function handleSubmit() {
    if (!canSubmit || classYear == null) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        name: name.trim(),
        classYear,
        major: major.trim() || undefined,
        interests,
      });
      if (isEdit) {
        showToast('Profile saved');
        navigate('/profile');
      }
      // In onboarding mode, App switches to the feed once the profile is marked onboarded.
    } catch (err) {
      console.error('Failed to save profile', err);
      setError("Couldn't save your profile. Check your connection and try again.");
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

      <fieldset className="profile-setup__field">
        <legend className="profile-setup__label">Class year</legend>
        <div className="profile-setup__chips">
          {CLASS_YEARS.map((year) => (
            <button
              key={year}
              type="button"
              aria-pressed={classYear === year}
              className={`profile-setup__chip${classYear === year ? ' profile-setup__chip--active' : ''}`}
              onClick={() => setClassYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
      </fieldset>

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
