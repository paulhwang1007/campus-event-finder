import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { useState } from 'react';
import { IconArrowLeft, IconCalendar, IconChevronLeft, IconChevronRight } from './Icon';
import './DateTimePicker.css';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function thisWeekend(now: Date): Date {
  const day = now.getDay();
  if (day === 0 || day === 6) return now;
  return addDays(now, 6 - day);
}

interface Props {
  initialDate: Date | null;
  initialStart: string;
  initialEnd: string;
  onConfirm: (date: Date, start: string, end: string) => void;
  onBack: () => void;
}

export function DateTimePicker({ initialDate, initialStart, initialEnd, onConfirm, onBack }: Props) {
  const now = new Date();
  const today = startOfDay(now);
  const [selected, setSelected] = useState<Date>(initialDate ?? today);
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(selected));
  const [startTime, setStartTime] = useState(initialStart || '17:00');
  const [endTime, setEndTime] = useState(initialEnd || '18:00');

  const gridStart = startOfWeek(startOfMonth(viewMonth));
  const gridEnd = endOfWeek(endOfMonth(viewMonth));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function selectQuickPick(date: Date) {
    setSelected(startOfDay(date));
    setViewMonth(startOfMonth(date));
  }

  const dayLabel = isSameDay(selected, today)
    ? 'Today'
    : isSameDay(selected, addDays(today, 1))
      ? 'Tomorrow'
      : format(selected, 'EEE MMM d');

  return (
    <div className="screen">
      <button type="button" className="date-time__back" onClick={onBack}>
        <IconArrowLeft /> Back
      </button>

      <h1 className="date-time__heading">Date &amp; time</h1>

      <div className="date-time__quick-picks">
        <button
          type="button"
          className={`date-time__quick-pick${isSameDay(selected, today) ? ' date-time__quick-pick--active' : ''}`}
          onClick={() => selectQuickPick(today)}
        >
          Today
        </button>
        <button
          type="button"
          className={`date-time__quick-pick${isSameDay(selected, addDays(today, 1)) ? ' date-time__quick-pick--active' : ''}`}
          onClick={() => selectQuickPick(addDays(today, 1))}
        >
          Tomorrow
        </button>
        <button
          type="button"
          className={`date-time__quick-pick${isSameDay(selected, thisWeekend(today)) ? ' date-time__quick-pick--active' : ''}`}
          onClick={() => selectQuickPick(thisWeekend(today))}
        >
          This weekend
        </button>
      </div>

      <div className="date-time__calendar">
        <div className="date-time__calendar-header">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          >
            <IconChevronLeft size={16} />
          </button>
          <span>{format(viewMonth, 'MMMM yyyy')}</span>
          <button type="button" aria-label="Next month" onClick={() => setViewMonth(addMonths(viewMonth, 1))}>
            <IconChevronRight size={16} />
          </button>
        </div>

        <div className="date-time__weekdays">
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>

        <div className="date-time__days">
          {days.map((day) => {
            const outsideMonth = !isSameMonth(day, viewMonth);
            const disabled = isBefore(day, today);
            const isSelected = isSameDay(day, selected);
            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={disabled}
                className={[
                  'date-time__day',
                  outsideMonth && 'date-time__day--outside',
                  isSelected && 'date-time__day--selected',
                  !isSelected && isToday(day) && 'date-time__day--today',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelected(day)}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>

      <div className="date-time__times">
        <label className="date-time__time-field">
          <span>Starts</span>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
        <label className="date-time__time-field">
          <span>Ends</span>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </label>
      </div>

      <p className="date-time__preview">
        <IconCalendar size={14} /> {dayLabel} &middot; {formatTime(startTime)} &ndash; {formatTime(endTime)}
      </p>

      <button type="button" className="date-time__cta" onClick={() => onConfirm(selected, startTime, endTime)}>
        Set date and time
      </button>
    </div>
  );
}

export function formatTime(time: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return time;
  const hour = Number(match[1]);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${match[2]} ${period}`;
}
