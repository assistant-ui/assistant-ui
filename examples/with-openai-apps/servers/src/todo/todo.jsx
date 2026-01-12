import React, { useRef, useState, useEffect, useMemo, forwardRef } from "react";
import {
  AnimatePresence,
  motion,
  Reorder,
  useDragControls,
} from "framer-motion";
import { List, GripVertical, Plus, Calendar, EllipsisVertical, Trash2 } from "lucide-react";

// NEW: react-datepicker import (drop-in replacement for native date picker)
import DatePicker from "react-datepicker";

const todoData = window.todoData || [];

/* -------------------------- Inject datepicker CSS -------------------------- */
/* Keeps look aligned with the app: small font, black/gray, soft border/shadow,
   and ensures the calendar grid (weeks/days) renders correctly. */
let __datepickerStylesInjected = false;
function injectDatepickerStylesOnce() {
  if (__datepickerStylesInjected) return;
  __datepickerStylesInjected = true;
  const css = `
  .react-datepicker {
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";
    font-size: 12px;
    background: #fff;
    border: 1px solid rgba(0,0,0,0.10);
    border-radius: 10px;
    box-shadow: 0 10px 24px rgba(0,0,0,0.10);
    color: rgba(0,0,0,0.85);
    overflow: hidden;
    min-width: 232px;
    transform: translateX(calc(-100% + 32px));
  }
    .react-datepicker__aria-live { display: none; }
  .react-datepicker__month-container { float: none; }
  .react-datepicker__header {
    background: #fff;
    border-bottom: 1px solid rgba(0,0,0,0.08);
    padding: 0; /* we'll manage spacing in the custom header */
    text-align: center;
  }
  .react-datepicker__current-month, .react-datepicker-time__header, .react-datepicker-year-header {
    font-size: 12px;
    font-weight: 600;
    color: rgba(0,0,0,0.75);
  }
  .react-datepicker__day-names {
    display: flex;
    justify-content: center;
    gap: 0.2rem;
    margin: 0.2rem 0 0.1rem 0;
  }
  .react-datepicker__day-name, .react-datepicker__day, .react-datepicker__time-name {
    width: 2rem;
    line-height: 2rem;
    text-align: center;
    margin: 0.1rem;
    color: rgba(0,0,0,0.70);
  }
  .react-datepicker__day-name { color: rgba(0,0,0,0.45); font-weight: 600; }
  .react-datepicker__month { margin: 0.25rem 0.4rem 0.5rem; }
  .react-datepicker__week {
    display: flex;
    justify-content: center;
  }
  .react-datepicker__day:hover {
    background: rgba(0,0,0,0.06);
    border-radius: 6px;
    cursor:pointer;
  }
  .react-datepicker__day--selected, .react-datepicker__day--keyboard-selected {
    background: rgba(0,0,0,0.85);
    color: #fff;
    border-radius: 6px;
  }

  /* Hide default nav buttons entirely (we render our own header). */
  .react-datepicker__navigation { display: none !important; }

  .react-datepicker__triangle { display: none; } /* no popper arrow */

  /* Popper wrapper — let Popper compute offsets, but keep it non-fixed */
  .react-datepicker-popper {
    position: absolute !important;
    z-index: 70;
  }
  `;
  const style = document.createElement("style");
  style.setAttribute("data-injected", "react-datepicker-minimal");
  style.textContent = css;
  document.head.appendChild(style);
}

/* Framer-motion wrappers */
const MotionCard = motion.div;
const MotionGrip = motion.create(GripVertical);
const MotionTrash = motion.create(Trash2);
const MotionList = motion.create(List);

const MAX_CARD_WIDTH_REM = 28;
const MAX_CARD_HEIGHT_REM = 31;
const DEFAULT_LIST_TITLE = "Untitled List";

/* --------------------------------- Utils -------------------------------- */

/** Small, fast, stable id generator (no external deps). */
function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return (
    (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).toUpperCase()
  );
}

/** Format YYYY-MM-DD for compact display (e.g., "Aug 12" or "Aug 12, 2026"). */
function formatDueDate(d) {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length !== 3) return "";
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const dt = new Date(y, (m || 1) - 1, day || 1);
  const now = new Date();
  const sameYear = dt.getFullYear() === now.getFullYear();
  const opts = sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" };
  return dt.toLocaleDateString(undefined, opts);
}

/** Parse YYYY-MM-DD -> Date (local) */
function parseYMD(s) {
  if (!s || typeof s !== "string") return null;
  const [y, m, d] = s.split("-").map((v) => parseInt(v, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Date -> YYYY-MM-DD */
function toYMD(date) {
  if (!(date instanceof Date) || isNaN(date)) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Clone seed, adding defaults + stable ids. Keeps `isCurrentlyOpen` if present. */
function buildInitialData() {
  const addTodoDefaults = (t) => ({
    id: t.id ?? uid(),
    isComplete: !!t.isComplete,
    note: t.note ?? "",
    title: t.title ?? "",
    // Store as YYYY-MM-DD string (or null)
    dueDate: typeof t.dueDate === "string" ? t.dueDate : null,
  });

  const lists = (todoData || []).map((l) => ({
    id: l.id ?? uid(),
    title: l.title ?? "",
    isCurrentlyOpen: !!l.isCurrentlyOpen,
    todos: (l.todos ?? []).map(addTodoDefaults),
  }));

  return { lists };
}

/** Click outside hook */
function useClickOutside(ref, handler) {
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) handler();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, handler]);
}

/** Position of a child rect relative to a container rect */
function getRelativePosition(element, target) {
  if (!element || !target) throw new Error("Both element and target must be provided");
  const left = element.left - target.left;
  const top = element.top - target.top;
  const width = element.width;
  const height = element.height;
  return { left, top, width, height };
}

/* -------------------------- Circular checkbox --------------------------- */
function CircleCheckbox({ checked, onToggle, label }) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onToggle();
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="w-4 h-4 rounded-full border flex items-center justify-center cursor-pointer select-none outline-none border-gray-400 focus-visible:ring-2 focus-visible:ring-black/20"
      aria-label={label}
    >
      <AnimatePresence initial={false}>
        {checked && (
          <motion.div
            key="dot"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.28 }}
            className="rounded-full bg-black w-[11.5px] h-[11.5px]"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------- BaseCard -------------------------------- */
function BaseCard({ children }) {
  return (
    <MotionCard className="absolute top-0 left-0 w-full h-full bg-gray-50/100 rounded-3xl border border-black/10 shadow-[0px_8px_14px_rgba(0,0,0,0.05)] overflow-hidden">
      {children}
    </MotionCard>
  );
}

/* ===================== Unified Details Section (stable input) ===================== */
function DetailsSection({
  isOpen,
  item,
  updateItemById,
  noteRef,
  autoFocusNote,
  onClickInside,
}) {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="details"
          initial={{ height: 0 }}
          animate={{ height: "auto" }}
          exit={{ height: 0 }}
          transition={{ type: "spring", bounce: 0.24, duration: 0.35 }}
          className="overflow-hidden"
          layout
        >
          <div
            className="px-8 pb-3.5 pt-0 flex flex-col gap-2 text-sm"
            onClick={(e) => {
              e.stopPropagation();
              onClickInside && onClickInside();
            }}
          >
            <input
              ref={noteRef}
              autoFocus={autoFocusNote}
              value={item.note ?? ""}
              onChange={(e) => updateItemById(item.id, { note: e.target.value })}
              placeholder="Add Note"
              className="-ml-1 w-full bg-transparent outline-none border-0 focus:ring-0 focus-visible:ring-0 text-sm text-black/55 placeholder-black/30"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============================= Item row ============================= */
function TodoListItem({
  item,
  index,
  isNew,
  updateItemById,
  deleteTodoById,
}) {
  const controls = useDragControls();
  const [isFocused, setIsFocused] = useState(isNew ?? false);
  const [isHovered, setIsHovered] = useState(false);
  const [focusTarget, setFocusTarget] = useState(isNew ? "title" : null);

  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);

  // For drag vs click discrimination on the ellipsis
  const dragStartedRef = useRef(false);
  const pointerDownPosRef = useRef(null);
  const POINTER_THRESHOLD = 4; // px movement to consider it a drag

  const containerRef = useRef(null);
  const titleRef = useRef(null);
  const noteRef = useRef(null);
  const menuRef = useRef(null);

  useClickOutside(containerRef, () => {
    setIsFocused(false);
    setFocusTarget(null);
    setMenuOpen(false);
  });
  useClickOutside(menuRef, () => setMenuOpen(false));

  /* Programmatic focusing */
  useEffect(() => {
    if (!isFocused) return;
    if (focusTarget === "title" && titleRef.current) titleRef.current.focus();
    if (focusTarget === "note" && noteRef.current) noteRef.current.focus();
  }, [isFocused, focusTarget]);

  const hasNote = (item.note ?? "").length > 0;
  const detailsOpen = isFocused || hasNote;

  /* --------- Date picker (react-datepicker) ---------- */
  const dateLabel = formatDueDate(item.dueDate);
  const selectedDate = parseYMD(item.dueDate);
  const datepickerRef = useRef(null);

  const openReactDatePicker = () => {
    try {
      datepickerRef.current?.setOpen(true);
    } catch {}
  };

  // Create a unique, per-row portal target right under the calendar button group.
  const portalId = useMemo(() => `dp-portal-${item.id}`, [item.id]);

  // Invisible input used only as the anchor element for Popper.
  const HiddenAnchorInput = forwardRef(function HiddenAnchorInput(props, ref) {
    return (
      <input
        {...props}
        ref={ref}
        className="absolute top-full left-0 w-[1px] h-[1px] opacity-0 pointer-events-none"
        aria-hidden
        tabIndex={-1}
      />
    );
  });

  /* -------------------- Ellipsis handlers -------------------- */
  const onEllipsisPointerDown = (e) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    dragStartedRef.current = false;
  };

  const onEllipsisPointerMove = (e) => {
    if (!pointerDownPosRef.current || dragStartedRef.current) return;
    const dx = e.clientX - pointerDownPosRef.current.x;
    const dy = e.clientY - pointerDownPosRef.current.y;
    if (Math.hypot(dx, dy) >= POINTER_THRESHOLD) {
      dragStartedRef.current = true;
      setMenuOpen(false);
      controls.start(e);
    }
  };

  const endPointerCycle = (e) => {
    pointerDownPosRef.current = null;
    dragStartedRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const onEllipsisPointerUp = (e) => {
    e.stopPropagation();
    if (!dragStartedRef.current) {
      setMenuOpen((o) => !o);
    }
    endPointerCycle(e);
  };

  const onEllipsisPointerCancel = (e) => {
    endPointerCycle(e);
  };

  /* --------- Custom header for react-datepicker (Prev | Month YYYY | Next) --------- */
  function monthYearLabel(date) {
    try {
      return date?.toLocaleDateString(undefined, { month: "long", year: "numeric" }) || "";
    } catch {
      return "";
    }
  }

  const renderHeader = ({
    date,
    decreaseMonth,
    increaseMonth,
    prevMonthButtonDisabled,
    nextMonthButtonDisabled,
  }) => {
    return (
      <div className="relative flex items-center justify-center px-2 py-2">
        <button
          type="button"
          onClick={decreaseMonth}
          disabled={prevMonthButtonDisabled}
          className="absolute left-2 text-[12px] font-medium text-black/70 hover:text-black disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Previous month"
        >
          Prev
        </button>
        <div className="text-[12px] font-semibold text-black/75">
          {monthYearLabel(date)}
        </div>
        <button
          type="button"
          onClick={increaseMonth}
          disabled={nextMonthButtonDisabled}
          className="absolute right-2 text-[12px] font-medium text-black/70 hover:text-black disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Next month"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <Reorder.Item
      value={item.id}
      id={item.id}
      key={item.id}
      ref={containerRef}
      as="div"
      dragListener={false}
      dragControls={controls}
      className="relative"
      layout="position"
      initial={false}
    >
      <motion.div
        layout
        initial={isNew ? { opacity: 0, y: 18, scale: 0.98 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, filter: "blur(4px)", scale: 0.98 }}
        transition={{ type: "spring", bounce: 0.18, duration: 0.42 }}
        className="border-b border-black/5 bg-white"
      >
        {/* Top row */}
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="flex gap-3 py-3 items-center"
          onClick={() => {
            setIsFocused(true);
            setFocusTarget("title");
          }}
        >
          {/* Circle checkbox */}
          <CircleCheckbox
            checked={!!item.isComplete}
            onToggle={() => updateItemById(item.id, { isComplete: !item.isComplete })}
            label={item.title || "Todo"}
          />

          {/* Title input */}
          <input
            ref={titleRef}
            onClick={(e) => {
              e.stopPropagation();
              setIsFocused(true);
              setFocusTarget("title");
            }}
            onChange={(e) => updateItemById(item.id, { title: e.target.value })}
            placeholder="Add a to-do"
            className="leading-tight flex-auto border-transparent border-0 bg-transparent !text-base p-0 outline-none focus-visible:ring-0"
            value={item.title}
          />

          {/* Date controls (react-datepicker) */}
          <div
            className="relative shrink-0 flex items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {!dateLabel && (
              <motion.button
                type="button"
                animate={{ opacity: isHovered ? 1 : 0 }}
                onClick={openReactDatePicker}
                aria-label="Edit due date"
                className="p-1 rounded-md hover:bg-black/5"
              >
                <Calendar className="w-4 h-4 text-black/40" />
              </motion.button>
            )}

            {dateLabel && (
              <button
                type="button"
                onClick={openReactDatePicker}
                aria-label={`Edit due date ${dateLabel}`}
                className="text-sm text-black/40 hover:text-black/70 rounded-md"
              >
                {dateLabel}
              </button>
            )}

            {/* Absolutely positioned portal directly beneath the controls */}
            <div id={portalId} className="absolute left-0 top-full mt-1 z-[70]" />

            {/* Hidden input anchors Popper; calendar content portals into the div above */}
            <DatePicker
              ref={datepickerRef}
              selected={selectedDate}
              onChange={(date) => {
                const ymd = toYMD(date);
                updateItemById(item.id, { dueDate: ymd });
              }}
              dateFormat="yyyy-MM-dd"
              customInput={<HiddenAnchorInput />}
              shouldCloseOnSelect
              showPopperArrow={false}
              popperPlacement="bottom-start"
              popperStrategy="absolute"
              popperModifiers={[
                { name: "offset", options: { offset: [0, 6] } },
                { name: "preventOverflow", options: { padding: 8, boundary: "clippingParents" } },
              ]}
              /* Use our custom header so we can show "Prev" and "Next" at the extremes */
              renderCustomHeader={renderHeader}
              // NOTE: no withPortal — we portal into our local absolute container instead
              portalId={portalId}
              onClickOutside={() => datepickerRef.current?.setOpen(false)}
            />
          </div>

          {/* Ellipsis: appears only on hover; click vs drag logic */}
          <div
            className="relative shrink-0 w-2 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              type="button"
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="p-1 rounded-md select-none text-black/30 hover:text-black cursor-pointer"
              style={{ touchAction: "none" }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              onPointerDown={onEllipsisPointerDown}
              onPointerMove={onEllipsisPointerMove}
              onPointerUp={onEllipsisPointerUp}
              onPointerCancel={onEllipsisPointerCancel}
            >
              <EllipsisVertical className="w-4 h-4" />
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  ref={menuRef}
                  initial={{ opacity: 0, scale: 0.98, y: -2 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -2 }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.18 }}
                  className="absolute right-0 top-full mt-1 min-w-[120px] rounded-md border border-black/10 bg-white shadow-md z-20"
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    role="menuitem"
                    className="w-full text-left text-sm px-3 py-2 hover:bg-black/5"
                    onClick={() => {
                      setMenuOpen(false);
                      deleteTodoById(item.id);
                    }}
                  >
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Details area */}
        <DetailsSection
          isOpen={detailsOpen}
          item={item}
          updateItemById={updateItemById}
          noteRef={noteRef}
          autoFocusNote={isFocused && focusTarget === "note"}
          onClickInside={() => {
            setIsFocused(true);
            setFocusTarget("note");
          }}
        />
      </motion.div>
    </Reorder.Item>
  );
}

/* ============================= List detail ============================= */
function TodoList({
  list,
  items,
  setItemsByOrder, // (ids: string[]) => void
  updateItemById,
  deleteItemById,
  updateListById,
  recentlyAddedId,
}) {
  const titleInputRef = useRef(null);
  const [titleDraft, setTitleDraft] = useState(list.title ?? "");

  useEffect(() => {
    setTitleDraft(list.title ?? "");
  }, [list.id, list.title]);

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    const nextTitle = trimmed.length > 0 ? trimmed : DEFAULT_LIST_TITLE;
    if (nextTitle !== titleDraft) {
      setTitleDraft(nextTitle);
    }
    if ((list.title ?? "") !== nextTitle) {
      updateListById(list.id, { title: nextTitle });
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTitle();
      // Blur after commit so focus ring disappears once saved
      titleInputRef.current?.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setTitleDraft(list.title ?? "");
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => {
          titleInputRef.current?.blur();
        });
      } else {
        titleInputRef.current?.blur();
      }
    }
  };

  const itemIds = useMemo(() => items.map((t) => t.id), [items]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0 } }}
      exit={{ opacity: 0, transition: { delay: 0.24, duration: 0.24 } }}
      transition={{ type: "spring", bounce: 0.16, duration: 0.56 }}
      className="bg-white w-full h-full overflow-auto"
      layout
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ type: "spring", bounce: 0.16, duration: 0.56 }}
        className="w-full flex top-0 left-0 absolute h-14 bg-white z-10"
      />
      <motion.div
        initial={{ scale: 1, y: 0, fontWeight: 500 }}
        animate={{ scale: 1.5, y: 40, fontWeight: 500 }}
        exit={{ scale: 1, y: 0, fontWeight: 500 }}
        transition={{ type: "spring", bounce: 0.16, duration: 0.56 }}
        className="text-md tracking-tight m-5 origin-top-left"
      >
        <input
          ref={titleInputRef}
          type="text"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={handleTitleKeyDown}
          placeholder={DEFAULT_LIST_TITLE}
          className="w-full bg-transparent border-0 outline-none focus:ring-0 focus-visible:ring-0 p-0 m-0 text-inherit"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0 } }}
        exit={{ opacity: 0 }}
        transition={{ type: "spring", bounce: 0.16, duration: 0.56 }}
        className="p-5 mt-10 flex flex-col"
        layout
      >
        {/* Use ID-based reordering to avoid flicker */}
        <Reorder.Group
          as="div"
          axis="y"
          values={itemIds}
          onReorder={setItemsByOrder}
        >
          <AnimatePresence initial={false}>
            {items.map((item, i) => (
              <TodoListItem
                key={item.id}
                index={i}
                item={item}
                isNew={recentlyAddedId === item.id}
                updateItemById={updateItemById}
                deleteTodoById={deleteItemById}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </motion.div>
    </motion.div>
  );
}

/* ============================ Zoom container ============================ */
function ZoomViewer({ origin, containerRef, children }) {
  const originRect = getRelativePosition(
    origin.current.getBoundingClientRect(),
    containerRef.current.getBoundingClientRect()
  );
  const initial = {
    left: originRect.left,
    top: originRect.top,
    width: originRect.width,
    height: originRect.height,
  };
  const animate = { left: 0, top: 0, width: "100%", height: "100%" };
  return (
    <motion.div
      initial={initial}
      animate={animate}
      exit={initial}
      transition={{ type: "spring", bounce: 0.16, duration: 0.56 }}
      className="absolute overflow-hidden w-full h-full"
    >
      {children}
    </motion.div>
  );
}

/* Shows a list row with a smaller trash icon on hover (like todos) */
function TodoListGroup({
  index,
  title,
  isExpanded,
  containerRef,
  setCurrentTodoList,
  onDelete,
  registerRowRef,
}) {
  const ref = useRef(null);
  const [height, setHeight] = useState("auto");
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (ref.current) setHeight(ref.current.getBoundingClientRect().height);
    if (registerRowRef) registerRowRef(index, ref);
  }, [index, registerRowRef]);

  return (
    <motion.div animate={{ height: isExpanded ? "100%" : height }}>
      <div
        ref={ref}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="p-5 text-md cursor-pointer hover:bg-white/40 border-b border-black/10 flex items-center gap-3"
        onClick={() => setCurrentTodoList(ref, index)}
      >
        <div className="flex-1">{title}</div>
        <MotionTrash
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="w-4 h-4 text-black/30 hover:text-black cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(index);
          }}
        />
      </div>
    </motion.div>
  );
}

/* ================================ App =================================== */
export function App() {
  const ref = useRef(null);
  const initialData = buildInitialData();
  const [data, setData] = useState(initialData);

  useEffect(() => {
    injectDatepickerStylesOnce();
  }, []);

  // index of the currently opened list, or null
  const initialOpenIndex = useMemo(() => {
    const idx = (initialData.lists || []).findIndex((l) => l.isCurrentlyOpen);
    return idx >= 0 ? idx : null;
  }, [initialData]);

  const [currentTodoListRef, setCurrentTodoListRef] = useState(null);
  const [currentTodoList, setCurrentTodoList] = useState(initialOpenIndex);
  const [recentlyAddedId, setRecentlyAddedId] = useState(null);

  const [rowRefs, setRowRefs] = useState({}); // index -> ref

  const registerRowRef = (index, rowRef) => {
    setRowRefs((prev) => ({ ...prev, [index]: rowRef }));
  };

  // If we default-opened a list via isCurrentlyOpen, try to capture its row ref for ZoomViewer
  useEffect(() => {
    if (currentTodoList != null && !currentTodoListRef) {
      const r = rowRefs[currentTodoList];
      if (r && r.current) {
        setCurrentTodoListRef(r);
      }
    }
  }, [currentTodoList, currentTodoListRef, rowRefs]);

  const todoLists = data.lists;
  const currentList = currentTodoList != null ? todoLists[currentTodoList] : null;
  const currentItems = currentList ? currentList.todos : [];

  /* List-level ops */
  const addList = () => {
    setData((prev) => ({
      lists: [{ id: uid(), title: "New List", isCurrentlyOpen: false, todos: [] }, ...prev.lists],
    }));
    setCurrentTodoList((idx) => (idx == null ? idx : idx + 1));
  };

  const deleteList = (listIndex) => {
    setData((prev) => {
      const lists = prev.lists.slice();
      lists.splice(listIndex, 1);
      return { lists };
    });
    setCurrentTodoList((idx) => {
      if (idx == null) return idx;
      if (idx === listIndex) {
        setCurrentTodoListRef(null);
        return null;
      }
      if (idx > listIndex) return idx - 1;
      return idx;
    });
  };

  const openList = (r, index) => {
    setCurrentTodoListRef(r || null);
    setCurrentTodoList(index);
    // Optionally reflect open state back into data
    setData((prev) => {
      const lists = prev.lists.map((l, i) => ({ ...l, isCurrentlyOpen: i === index }));
      return { lists };
    });
  };

  const updateListById = (listId, val) => {
    setData((prev) => ({
      lists: prev.lists.map((l) => (l.id === listId ? { ...l, ...val } : l)),
    }));
  };

  /* Todo-level ops, id-based (stable across reorders) */
  const addTodo = () => {
    if (currentList == null) return;
    const newId = uid();
    setRecentlyAddedId(newId);
    setTimeout(() => setRecentlyAddedId(null), 600);

    setData((prev) => {
      const lists = prev.lists.slice();
      const listIdx = currentTodoList;
      const list = { ...lists[listIdx] };
      list.todos = [
        { id: newId, title: "", isComplete: false, note: "", dueDate: null },
        ...list.todos,
      ];
      lists[listIdx] = list;
      return { lists };
    });
  };

  const deleteItemById = (id) => {
    if (currentList == null) return;
    setData((prev) => {
      const lists = prev.lists.slice();
      const listIdx = currentTodoList;
      const list = { ...lists[listIdx] };
      list.todos = list.todos.filter((t) => t.id !== id);
      lists[listIdx] = list;
      return { lists };
    });
  };

  // Reorder within the current list: receives the new order of IDs
  const setItemsByOrder = (orderedIds) => {
    if (currentList == null) return;
    setData((prev) => {
      const lists = prev.lists.slice();
      const listIdx = currentTodoList;
      const list = { ...lists[listIdx] };
      const byId = new Map(list.todos.map((t) => [t.id, t]));
      list.todos = orderedIds.map((id) => byId.get(id)).filter(Boolean);
      lists[listIdx] = list;
      return { lists };
    });
  };

  const updateItemById = (id, val) => {
    if (currentList == null) return;
    setData((prev) => {
      const lists = prev.lists.slice();
      const listIdx = currentTodoList;
      const list = { ...lists[listIdx] };
      list.todos = list.todos.map((t) => (t.id === id ? { ...t, ...val } : t));
      lists[listIdx] = list;
      return { lists };
    });
  };

  return (
    <div className="my-5 antialiased">
      <div
        className="relative max-w/full max-h/full"
        style={{ width: `${MAX_CARD_WIDTH_REM}rem`, height: `${MAX_CARD_HEIGHT_REM}rem` }}
      >
        <BaseCard>
          <div ref={ref} className="w-full h-full pt-9">
            <div className="w-full flex top-0 left-0 absolute p-5 z-20">
              <MotionList
                initial={{ opacity: 0 }}
                animate={{ opacity: currentList ? 1 : 0 }}
                transition={{ type: "spring", bounce: 0.16, duration: 0.56 }}
                size={20}
                onClick={() => {
                  setCurrentTodoList(null);
                  setCurrentTodoListRef(null);
                  // Clear open state on lists
                  setData((prev) => ({ lists: prev.lists.map((l) => ({ ...l, isCurrentlyOpen: false })) }));
                }}
                className="cursor-pointer"
              />
              <div className="flex-auto" />
              <Plus size={20} onClick={currentList ? addTodo : addList} className="cursor-pointer" />
            </div>

            {/* Lists overview */}
            <motion.div
              animate={{
                opacity: currentList ? 0 : 1,
                filter: currentList ? "blur(8px)" : "blur(0px)",
              }}
              transition={{ type: "spring", bounce: 0.16, duration: 0.56 }}
              className="w-full h-full"
            >
              <div className="p-5">
                <h1 className="font-medium text-2xl tracking-tight">My Lists</h1>
              </div>
              {todoLists.map((list, idx) => (
                <TodoListGroup
                  key={list.id}
                  index={idx}
                  title={list.title}
                  isExpanded={idx === currentTodoList}
                  containerRef={ref}
                  setCurrentTodoList={openList}
                  onDelete={deleteList}
                  registerRowRef={registerRowRef}
                />
              ))}
            </motion.div>

            {/* Detail view; if we have an origin ref, use fancy ZoomViewer, else render directly */}
            <AnimatePresence mode="popLayout">
              {currentList != null && (
                currentTodoListRef ? (
                  <ZoomViewer origin={currentTodoListRef} containerRef={ref}>
                    <TodoList
                      list={currentList}
                      items={currentItems}
                      setItemsByOrder={setItemsByOrder}
                      updateItemById={updateItemById}
                      deleteItemById={deleteItemById}
                      updateListById={updateListById}
                      recentlyAddedId={recentlyAddedId}
                    />
                  </ZoomViewer>
                ) : (
                  <motion.div
                    key="direct-detail"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0"
                  >
                    <TodoList
                      list={currentList}
                      items={currentItems}
                      setItemsByOrder={setItemsByOrder}
                      updateItemById={updateItemById}
                      deleteItemById={deleteItemById}
                      updateListById={updateListById}
                      recentlyAddedId={recentlyAddedId}
                    />
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>
        </BaseCard>
      </div>
    </div>
  );
}

/* ---------- Mount helper for local testing ---------- */
// const root = createRoot(document.getElementById("root"));
// root.render(<App />);

export default App;
