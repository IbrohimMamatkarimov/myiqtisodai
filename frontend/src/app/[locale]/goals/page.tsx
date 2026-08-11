'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Target, Sparkles, Trash2, Loader2, X, Lock, Unlock, Users, UserPlus, Eye, EyeOff, MessageCircle, Send } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { GoalChatOverlay } from '@/components/GoalChatOverlay';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { api, getErrorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatAmount, formatCurrency, convertBetween } from '@/lib/currency';
import type { Goal, GoalInvite, GoalMember } from '@/types/finance';

const LANGUAGE_NAMES: Record<string, string> = { uz: 'Uzbek', en: 'English', ru: 'Russian' };
const CURRENCIES = ['UZS', 'USD', 'EUR'];

// Small emoji badge shown next to the title (always present, works even
// when there's no cover photo). The cover photo itself, when available,
// comes from the backend via Pexels (app/services/stock_photos.py) - a real
// moderated stock-photo library, picked by keyword-mapped category rather
// than a raw title search, specifically to avoid the inappropriate/off-topic
// results an earlier unmoderated AI image generator used to produce.
const GOAL_EMOJI: [RegExp, string][] = [
  [/noutbuk|laptop|kompyuter|computer/i, '\ud83d\udcbb'],
  [/telefon|phone|smartfon|iphone/i, '\ud83d\udcf1'],
  [/sayohat|travel|trip|dam olish|vacation|holiday/i, '\u2708\ufe0f'],
  [/mashina|avto|car|avtomobil/i, '\ud83d\ude97'],
  [/\buy\b|dom|house|kvartira|apartment|home/i, '\ud83c\udfe0'],
  [/to'y|toy|wedding/i, '\ud83d\udc8d'],
  [/talim|ta'lim|education|study|o'qish|kurs|course/i, '\ud83d\udcda'],
  [/sog'liq|salomatlik|health/i, '\ud83d\udcaa'],
  [/zaxira|jamg'arma|emergency|fund/i, '\ud83d\udc37'],
  [/biznes|business|startup/i, '\ud83d\udcbc'],
  [/sovg'a|gift|present/i, '\ud83c\udf81'],
  [/velosiped|bicycle|bike/i, '\ud83d\udeb2'],
  [/kiyim|clothes|fashion/i, '\ud83d\udc55'],
];

function emojiForGoal(title: string): string {
  const match = GOAL_EMOJI.find(([pattern]) => pattern.test(title));
  return match ? match[1] : '\ud83c\udfaf';
}

// Small reusable PIN input with a show/hide eye toggle - used for every PIN
// field on this page (create, legacy-first-allocation, withdraw).
function PinField({
  value,
  onChange,
  placeholder,
  name,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  name: string;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        inputMode="numeric"
        autoComplete="new-password"
        name={name}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field mt-1 pr-10"
        placeholder={placeholder}
        maxLength={32}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        className="absolute right-3 top-1/2 translate-y-[3px] text-textmuted hover:text-textmain transition-colors"
      >
        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

export default function GoalsPage() {
  const checked = useRequireAuth();
  const t = useTranslations('goals');
  const tc = useTranslations('common');
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingConfirmationGoalIds, setPendingConfirmationGoalIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [currency, setCurrency] = useState(user?.currency || 'UZS');
  const [lockDays, setLockDays] = useState('');
  const [lockDateMode, setLockDateMode] = useState<'preset' | 'custom'>('preset');
  const [customLockDate, setCustomLockDate] = useState('');
  const [createPin, setCreatePin] = useState('');
  const [createPinConfirm, setCreatePinConfirm] = useState('');
  const [createPinError, setCreatePinError] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isGroup, setIsGroup] = useState(false);

  // Members modal (view/invite/request-own-share-back) for group goals
  const [membersFor, setMembersFor] = useState<Goal | null>(null);
  const [members, setMembers] = useState<GoalMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Request my own share back from a group goal (always admin-approved)
  const [memberWithdrawOpen, setMemberWithdrawOpen] = useState(false);
  const [memberWithdrawAmount, setMemberWithdrawAmount] = useState('');
  const [memberWithdrawReason, setMemberWithdrawReason] = useState('');
  const [memberWithdrawError, setMemberWithdrawError] = useState('');
  const [memberWithdrawSubmitting, setMemberWithdrawSubmitting] = useState(false);
  const [memberWithdrawSentFor, setMemberWithdrawSentFor] = useState<string | null>(null);

  // Request to collect the ENTIRE box balance (not just my own share) -
  // same admin-approval gate as an own-share request, but confirming this
  // one requires every other member's PIN, not just a button tap.
  const [collectAllOpen, setCollectAllOpen] = useState(false);
  const [collectAllReason, setCollectAllReason] = useState('');
  const [collectAllError, setCollectAllError] = useState('');
  const [collectAllSubmitting, setCollectAllSubmitting] = useState(false);
  const [collectAllSentFor, setCollectAllSentFor] = useState<string | null>(null);

  // PIN entry per pending request being confirmed (only used for
  // 'collect_all' requests) - keyed by request id so multiple could
  // theoretically be entered independently, though only one request is ever
  // pending on a goal at once.
  const [confirmPins, setConfirmPins] = useState<Record<string, string>>({});
  const [confirmPinErrors, setConfirmPinErrors] = useState<Record<string, string>>({});
  const [forgotConfirmPinSentFor, setForgotConfirmPinSentFor] = useState<string | null>(null);
  const [forgotConfirmPinSubmitting, setForgotConfirmPinSubmitting] = useState(false);

  // Allocate (add funds) panel state
  const [allocateFor, setAllocateFor] = useState<string | null>(null);
  const [fundsAmount, setFundsAmount] = useState('');
  const [fundsCurrency, setFundsCurrency] = useState('UZS');
  const [legacyPin, setLegacyPin] = useState('');
  const [legacyPinConfirm, setLegacyPinConfirm] = useState('');
  const [allocateError, setAllocateError] = useState('');
  const [confirmingAllocate, setConfirmingAllocate] = useState<{ goal: Goal; amount: number; pin?: string } | null>(null);

  // Withdraw (unlock) panel state
  const [withdrawFor, setWithdrawFor] = useState<string | null>(null);
  const [withdrawPin, setWithdrawPin] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [deleteIntentFor, setDeleteIntentFor] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pageError, setPageError] = useState('');
  const [forgotPinSentFor, setForgotPinSentFor] = useState<string | null>(null);
  const [forgotPinSubmitting, setForgotPinSubmitting] = useState(false);

  // Early-unlock request (sent to admin for time-locked goals)
  const [unlockRequestFor, setUnlockRequestFor] = useState<string | null>(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockRequestSubmitting, setUnlockRequestSubmitting] = useState(false);
  const [unlockRequestSentFor, setUnlockRequestSentFor] = useState<string | null>(null);
  const [unlockRequestError, setUnlockRequestError] = useState('');

  const [advice, setAdvice] = useState<Record<string, { loading: boolean; text?: string }>>({});

  // Pending invites addressed to ME - shown above the goals grid until I
  // accept or decline. A goal I've been invited to doesn't appear in the
  // main list at all until accepted (backend gate, not just hidden here).
  const [invites, setInvites] = useState<GoalInvite[]>([]);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  // Accepting an invite now requires setting my OWN confirm PIN first (used
  // later whenever another member on this goal needs my sign-off) - this
  // tracks which invite card is showing that PIN step.
  const [acceptingInviteId, setAcceptingInviteId] = useState<string | null>(null);
  const [acceptPin, setAcceptPin] = useState('');
  const [acceptPinConfirm, setAcceptPinConfirm] = useState('');
  const [acceptPinError, setAcceptPinError] = useState('');

  // Pending withdrawal requests for the goal currently open in the Members
  // modal - confirm/reject shows for whichever ones name ME as a needed
  // confirmer (every other accepted member gets one, not just the admin).
  const [withdrawRequests, setWithdrawRequests] = useState<
    { id: string; user_id: string; amount: number; currency: string; reason: string | null; status: string; request_type: string; confirmations: { user_id: string; full_name: string; decision: string }[] }[]
  >([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Chat thread — now a full-screen overlay (GoalChatOverlay, shared with
  // the dashboard) opened directly from the goal card. The in-modal chat
  // toggle further down (chatOpen) is a separate, still-inline mini version
  // shown inside the Members modal - not yet consolidated into the same
  // component, since it renders inline rather than full-screen.
  const [fullscreenChatGoal, setFullscreenChatGoal] = useState<Goal | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ id: string; user_id: string; full_name: string; body: string; created_at: string }[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  function loadInvites() {
    api.get<GoalInvite[]>('/goals/invites').then(({ data }) => setInvites(data)).catch(() => setInvites([]));
  }

  async function respondToInvite(inviteId: string, accept: boolean, pin?: string) {
    setRespondingTo(inviteId);
    setAcceptPinError('');
    try {
      await api.post(`/goals/invites/${inviteId}/respond`, { accept, pin });
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      setAcceptingInviteId(null);
      setAcceptPin('');
      setAcceptPinConfirm('');
      if (accept) loadGoals();
    } catch (err: any) {
      if (accept) setAcceptPinError(getErrorMessage(err, t('pinMismatch')));
    } finally {
      setRespondingTo(null);
    }
  }

  function startAcceptInvite(inviteId: string) {
    setAcceptingInviteId(inviteId);
    setAcceptPin('');
    setAcceptPinConfirm('');
    setAcceptPinError('');
  }

  function submitAcceptInvite(inviteId: string) {
    setAcceptPinError('');
    if (acceptPin.length < 4) {
      setAcceptPinError(t('pinPlaceholder'));
      return;
    }
    if (acceptPin !== acceptPinConfirm) {
      setAcceptPinError(t('pinMismatch'));
      return;
    }
    respondToInvite(inviteId, true, acceptPin);
  }

  function loadGoals() {
    setLoading(true);
    api.get<Goal[]>('/goals').then(({ data }) => setGoals(data)).finally(() => setLoading(false));
  }

  function loadPendingConfirmations() {
    api
      .get<string[]>('/goals/pending-confirmations')
      .then(({ data }) => setPendingConfirmationGoalIds(new Set(data)))
      .catch(() => {});
  }

  useEffect(() => {
    if (!checked) return;
    loadGoals();
    loadInvites();
    loadPendingConfirmations();
  }, [checked]);

  // Deep link from the dashboard's compact group card (?openWithdraw=<id>) -
  // jumps straight to the withdraw-request form inside the Members modal
  // instead of landing here with no obvious next step. Reads the raw URL
  // (not next/navigation's useSearchParams, which needs a Suspense boundary
  // at build time) since this only ever needs to run once, client-side,
  // after mount. The ref guard stops it from firing again on a later
  // loadGoals() (invite accept, allocate, etc.) and popping the modal back
  // open after the person already closed it.
  const openedFromQueryRef = useRef(false);
  useEffect(() => {
    if (openedFromQueryRef.current || goals.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const withdrawGoalId = params.get('openWithdraw');
    const collectAllGoalId = params.get('openCollectAll');
    const goalId = withdrawGoalId || collectAllGoalId;
    if (!goalId) return;
    const goal = goals.find((g) => g.id === goalId);
    if (goal) {
      openedFromQueryRef.current = true;
      openMembers(goal, !!withdrawGoalId, !!collectAllGoalId);
    }
  }, [goals]);

  if (!checked) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreatePinError('');
    if (createPin.length < 4) {
      setCreatePinError(t('pinPlaceholder'));
      return;
    }
    if (createPin !== createPinConfirm) {
      setCreatePinError(t('pinMismatch'));
      return;
    }
    setSubmitting(true);
    try {
      let effectiveLockDays: number | undefined;
      if (!isGroup) {
        if (lockDateMode === 'custom' && customLockDate) {
          const diffMs = new Date(customLockDate).setHours(23, 59, 59, 999) - Date.now();
          effectiveLockDays = Math.max(1, Math.ceil(diffMs / 86400000));
        } else if (lockDateMode === 'preset' && lockDays) {
          effectiveLockDays = Number(lockDays);
        }
      }
      const { data: created } = await api.post<Goal>('/goals', {
        title,
        target_amount: parseFloat(targetAmount),
        deadline: deadline || undefined,
        currency,
        lock_days: effectiveLockDays,
        pin: createPin,
        is_group: isGroup,
      });
      // Photo is entirely optional and separate from goal creation itself -
      // if this upload fails, the goal still exists with its emoji badge.
      if (photoFile) {
        try {
          const formData = new FormData();
          formData.append('file', photoFile);
          await api.post(`/goals/${created.id}/image`, formData);
        } catch {
          // ignore - goal was created fine, photo just didn't attach
        }
      }
      setTitle('');
      setTargetAmount('');
      setDeadline('');
      setCurrency(user?.currency || 'UZS');
      setLockDays('');
      setLockDateMode('preset');
      setCustomLockDate('');
      setCreatePin('');
      setCreatePinConfirm('');
      setPhotoFile(null);
      setPhotoPreview(null);
      setIsGroup(false);
      setShowForm(false);
      loadGoals();
    } finally {
      setSubmitting(false);
    }
  }

  function handlePhotoSelect(file: File | null | undefined) {
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleRemovePhoto(goalId: string) {
    try {
      await api.delete(`/goals/${goalId}/image`);
      loadGoals();
    } catch {
      // non-critical - leave the photo as-is if this fails
    }
  }

  function openAllocate(goal: Goal) {
    setAllocateFor(goal.id);
    setFundsAmount('');
    setFundsCurrency(goal.currency || user?.currency || 'UZS');
    setAllocateError('');
    setLegacyPin('');
    setLegacyPinConfirm('');
  }

  async function handleAllocate(goal: Goal) {
    setAllocateError('');
    const typed = parseFloat(fundsAmount);
    if (!typed || typed <= 0) return;
    const goalCurrency = goal.currency || user?.currency || 'UZS';
    // Person can type in whatever currency they have on hand - convert to
    // the goal's own currency before sending (that's what the backend and
    // the goal's progress bar are denominated in).
    const amount = convertBetween(typed, fundsCurrency, goalCurrency);

    // Legacy goals from before PIN-at-creation existed still need a PIN
    // captured on their first allocation. Group goals never use a PIN at all.
    let legacyPinPayload: string | undefined;
    if (!goal.has_pin && !goal.is_group) {
      if (legacyPin.length < 4) {
        setAllocateError(t('pinPlaceholder'));
        return;
      }
      if (legacyPin !== legacyPinConfirm) {
        setAllocateError(t('pinMismatch'));
        return;
      }
      legacyPinPayload = legacyPin;
    }

    // Show an in-app confirmation step (themed, not the native browser
    // confirm() popup which looked broken/out of place, especially in dark
    // mode) before actually moving the money.
    setConfirmingAllocate({ goal, amount, pin: legacyPinPayload });
  }

  async function submitAllocate() {
    if (!confirmingAllocate) return;
    const { goal, amount, pin } = confirmingAllocate;
    setSubmitting(true);
    try {
      await api.post(`/goals/${goal.id}/allocate`, { amount, pin });
      setConfirmingAllocate(null);
      setAllocateFor(null);
      loadGoals();
    } catch (err: any) {
      setConfirmingAllocate(null);
      setAllocateError(getErrorMessage(err, t('pinMismatch')));
    } finally {
      setSubmitting(false);
    }
  }

  function openWithdraw(goalId: string) {
    setWithdrawFor(goalId);
    setWithdrawPin('');
    setWithdrawError('');
    setForgotPinSentFor(null);
  }

  async function handleForgotPin(goalId: string) {
    setForgotPinSubmitting(true);
    try {
      await api.post(`/goals/${goalId}/forgot-pin`);
      setForgotPinSentFor(goalId);
    } catch (err: any) {
      setWithdrawError(getErrorMessage(err, t('unlockRequestError')));
    } finally {
      setForgotPinSubmitting(false);
    }
  }

  async function handleWithdraw(goalId: string) {
    if (withdrawPin.length < 4) return;
    setSubmitting(true);
    setWithdrawError('');
    try {
      await api.post(`/goals/${goalId}/withdraw`, { pin: withdrawPin });
      if (deleteIntentFor === goalId) {
        // They were trying to delete a locked goal - now that the funds are
        // back in their balance and the goal is unlocked, finish the delete.
        await api.delete(`/goals/${goalId}`);
        setGoals((prev) => prev.filter((g) => g.id !== goalId));
        setDeleteIntentFor(null);
      } else {
        loadGoals();
      }
      setWithdrawFor(null);
    } catch (err: any) {
      setWithdrawError(getErrorMessage(err, t('wrongPin')));
    } finally {
      setSubmitting(false);
    }
  }

  function openUnlockRequest(goalId: string) {
    setUnlockRequestFor(goalId);
    setUnlockReason('');
    setUnlockRequestError('');
  }

  function openFullscreenChat(goal: Goal) {
    // GoalChatOverlay fetches and owns all of its own state - nothing to
    // prefetch here.
    setFullscreenChatGoal(goal);
  }

  async function openMembers(goal: Goal, autoWithdraw?: boolean, autoCollectAll?: boolean, autoChat?: boolean) {
    setMembersFor(goal);
    setMembers([]);
    setWithdrawRequests([]);
    setInviteIdentifier('');
    setInviteError('');
    setMemberWithdrawOpen(false);
    setMemberWithdrawAmount('');
    setMemberWithdrawReason('');
    setMemberWithdrawError('');
    setCollectAllOpen(false);
    setCollectAllReason('');
    setCollectAllError('');
    setConfirmPins({});
    setConfirmPinErrors({});
    setForgotConfirmPinSentFor(null);
    setChatOpen(!!autoChat);
    setMessages([]);
    setNewMessage('');
    setMembersLoading(true);
    if (autoChat) loadMessages(goal.id);
    try {
      const [membersRes, requestsRes] = await Promise.all([
        api.get<GoalMember[]>(`/goals/${goal.id}/members`),
        api.get(`/goals/${goal.id}/withdraw-requests`).catch(() => ({ data: [] })),
      ]);
      setMembers(membersRes.data);
      setWithdrawRequests((requestsRes.data || []).filter((r: any) => r.status === 'pending'));
      // Opening the modal is how a pending confirmation actually gets
      // acted on - once they're looking at it, the red badge on the card
      // itself has done its job and shouldn't keep nagging.
      setPendingConfirmationGoalIds((prev) => {
        if (!prev.has(goal.id)) return prev;
        const next = new Set(prev);
        next.delete(goal.id);
        return next;
      });
      if (autoWithdraw) {
        const mine = membersRes.data.find((m) => m.user_id === user?.id);
        if (mine && mine.contributed_amount > 0) {
          setMemberWithdrawOpen(true);
          setMemberWithdrawAmount(String(mine.contributed_amount));
        }
      }
      if (autoCollectAll) {
        setCollectAllOpen(true);
      }
    } catch {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }

  async function loadMessages(goalId: string) {
    setMessagesLoading(true);
    try {
      const { data } = await api.get(`/goals/${goalId}/messages`);
      setMessages(data);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ block: 'nearest' }), 50);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }

  function toggleChat() {
    if (!membersFor) return;
    const opening = !chatOpen;
    setChatOpen(opening);
    if (opening && messages.length === 0) loadMessages(membersFor.id);
  }

  async function handleSendMessage() {
    if (!membersFor || newMessage.trim().length === 0) return;
    setSendingMessage(true);
    try {
      const { data } = await api.post(`/goals/${membersFor.id}/messages`, { body: newMessage.trim() });
      setMessages((prev) => [...prev, data]);
      setNewMessage('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ block: 'nearest' }), 50);
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleForgotConfirmPin(goalId: string) {
    setForgotConfirmPinSubmitting(true);
    try {
      await api.post(`/goals/${goalId}/members/forgot-confirm-pin`);
      setForgotConfirmPinSentFor(goalId);
    } finally {
      setForgotConfirmPinSubmitting(false);
    }
  }

  async function handleConfirmWithdraw(requestId: string, approve: boolean, pin?: string) {
    setConfirmingId(requestId);
    setConfirmPinErrors((prev) => ({ ...prev, [requestId]: '' }));
    try {
      await api.post(`/goals/withdraw-requests/${requestId}/confirm`, { approve, pin });
      setWithdrawRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      // Wrong PIN (or too-short PIN) on a collect-all confirmation - let
      // them retry rather than silently doing nothing, which is what this
      // used to do before there was any PIN involved to get wrong.
      setConfirmPinErrors((prev) => ({ ...prev, [requestId]: getErrorMessage(err, t('wrongPin')) }));
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleCollectAllRequest() {
    if (!membersFor) return;
    setCollectAllSubmitting(true);
    setCollectAllError('');
    try {
      const { data } = await api.post(`/goals/${membersFor.id}/request-collect-all`, {
        reason: collectAllReason.trim() || undefined,
      });
      setWithdrawRequests((prev) => [...prev, data]);
      setCollectAllSentFor(membersFor.id);
      setCollectAllOpen(false);
    } catch (err: any) {
      setCollectAllError(getErrorMessage(err, t('unlockRequestError')));
    } finally {
      setCollectAllSubmitting(false);
    }
  }

  async function handleInvite() {
    if (!membersFor || inviteIdentifier.trim().length < 3) return;
    setInviteSubmitting(true);
    setInviteError('');
    try {
      const { data } = await api.post<GoalMember>(`/goals/${membersFor.id}/members`, {
        identifier: inviteIdentifier.trim(),
      });
      setMembers((prev) => [...prev, data]);
      setInviteIdentifier('');
    } catch (err: any) {
      setInviteError(getErrorMessage(err, t('inviteError')));
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!membersFor) return;
    try {
      await api.delete(`/goals/${membersFor.id}/members/${userId}`);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (err: any) {
      setInviteError(getErrorMessage(err, t('removeMemberError')));
    }
  }

  async function handleMemberWithdrawRequest() {
    if (!membersFor) return;
    const amount = parseFloat(memberWithdrawAmount);
    if (!amount || amount <= 0) return;
    setMemberWithdrawSubmitting(true);
    setMemberWithdrawError('');
    try {
      const { data } = await api.post(`/goals/${membersFor.id}/request-member-withdraw`, {
        amount,
        reason: memberWithdrawReason.trim() || undefined,
      });
      // So the collect-all trigger below also disappears immediately,
      // without needing to reopen the modal - both read "is there already a
      // pending request" off this same array.
      setWithdrawRequests((prev) => [...prev, data]);
      setMemberWithdrawSentFor(membersFor.id);
      setMemberWithdrawOpen(false);
    } catch (err: any) {
      setMemberWithdrawError(getErrorMessage(err, t('unlockRequestError')));
    } finally {
      setMemberWithdrawSubmitting(false);
    }
  }

  async function submitUnlockRequest(goalId: string) {
    if (unlockReason.trim().length < 2) return;
    setUnlockRequestSubmitting(true);
    setUnlockRequestError('');
    try {
      await api.post(`/goals/${goalId}/request-unlock`, { reason: unlockReason.trim() });
      setUnlockRequestFor(null);
      setUnlockRequestSentFor(goalId);
    } catch (err: any) {
      setUnlockRequestError(getErrorMessage(err, t('unlockRequestError')));
    } finally {
      setUnlockRequestSubmitting(false);
    }
  }

  async function handleDelete(goal: Goal) {
    setPageError('');
    const timeLocked = !!goal.locked_until && new Date(goal.locked_until) > new Date();
    // A time-locked goal can't be withdrawn even with the correct PIN (the
    // backend enforces this too) - don't make them enter a PIN just to find
    // that out. Point straight to the emergency-unlock support flow instead.
    if (timeLocked) {
      openUnlockRequest(goal.id);
      return;
    }
    // A locked (but no-longer-time-locked) goal's money can only come back
    // out through the PIN-protected withdraw flow - deleting straight
    // through here used to silently drop the goal (and the PIN with it)
    // while the money stayed deducted forever.
    if (goal.is_locked) {
      setDeleteIntentFor(goal.id);
      openWithdraw(goal.id);
      return;
    }
    setDeletingId(goal.id);
    try {
      await api.delete(`/goals/${goal.id}`);
      setGoals((prev) => prev.filter((g) => g.id !== goal.id));
    } catch (err: any) {
      setPageError(getErrorMessage(err, t('deleteError')));
    } finally {
      setDeletingId(null);
    }
  }

  async function getAdvice(goal: Goal) {
    setAdvice((prev) => ({ ...prev, [goal.id]: { loading: true } }));
    const languageName = LANGUAGE_NAMES[locale] || 'English';
    try {
      const { data } = await api.post('/ai/ask', {
        question: `Respond only in ${languageName}, regardless of any other instruction. I have a savings goal called "${goal.title}": I've saved ${goal.current_amount} out of ${goal.target_amount}${goal.deadline ? `, deadline ${goal.deadline}` : ''}. In 2-3 short sentences, tell me realistically how I'm doing based on my actual income/expenses and ONE specific thing I could do to reach it faster.`,
        save_history: false,
      });
      setAdvice((prev) => ({ ...prev, [goal.id]: { loading: false, text: data.answer } }));
    } catch {
      setAdvice((prev) => ({ ...prev, [goal.id]: { loading: false, text: undefined } }));
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-textmain flex items-center gap-2.5">
          <img src="/box.png" alt="" className="h-8 w-8 object-contain" />
          {t('title')}
        </h1>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          <Plus size={18} />
          {t('addGoal')}
        </button>
      </div>

      {invites.length > 0 && (
        <div className="space-y-2 mb-6">
          {invites.map((inv) => (
            <div key={inv.id} className="glass-card p-4 border border-primary/20">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Users size={16} />
                  </span>
                  <p className="text-sm text-textmain min-w-0">
                    {t('inviteBanner', { owner: inv.owner_name, goal: inv.goal_title })}
                  </p>
                </div>
                {acceptingInviteId !== inv.id && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => respondToInvite(inv.id, false)}
                      disabled={respondingTo === inv.id}
                      className="btn-secondary text-sm px-3 py-1.5"
                    >
                      {t('declineInvite')}
                    </button>
                    <button
                      onClick={() => startAcceptInvite(inv.id)}
                      disabled={respondingTo === inv.id}
                      className="btn-primary text-sm px-3 py-1.5"
                    >
                      {t('acceptInvite')}
                    </button>
                  </div>
                )}
              </div>
              {acceptingInviteId === inv.id && (
                <div className="mt-3 pt-3 border-t border-textmain/10 space-y-2.5">
                  <p className="text-xs text-textmuted">{t('acceptInvitePinHint')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-text">{t('setPinLabel')}</label>
                      <PinField
                        name={`accept-pin-${inv.id}`}
                        autoFocus
                        value={acceptPin}
                        onChange={setAcceptPin}
                        placeholder={t('pinPlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="label-text">{t('confirmPinLabel')}</label>
                      <PinField
                        name={`accept-pin-confirm-${inv.id}`}
                        value={acceptPinConfirm}
                        onChange={setAcceptPinConfirm}
                        placeholder={t('pinPlaceholder')}
                      />
                    </div>
                  </div>
                  {acceptPinError && <p className="text-xs text-danger">{acceptPinError}</p>}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => submitAcceptInvite(inv.id)}
                      disabled={respondingTo === inv.id}
                      className="btn-primary text-sm px-3 py-1.5 flex-1"
                    >
                      {respondingTo === inv.id ? <Loader2 size={14} className="animate-spin" /> : t('acceptInvite')}
                    </button>
                    <button
                      onClick={() => setAcceptingInviteId(null)}
                      disabled={respondingTo === inv.id}
                      className="btn-secondary text-sm px-3 py-1.5"
                    >
                      {tc('cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="glass-card p-6 mb-6 space-y-4 max-w-lg">
          <div>
            <label className="label-text">{t('titleLabel')}</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field mt-1"
              placeholder={t('titlePlaceholder')}
            />
          </div>

          <div>
            <label className="flex items-center gap-3 rounded-xl border border-textmain/10 px-3.5 py-3 cursor-pointer hover:border-primary/30 transition-colors">
              <input
                type="checkbox"
                checked={isGroup}
                onChange={(e) => setIsGroup(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="flex items-center gap-2 text-sm font-medium text-textmain">
                <Users size={15} className="text-primary" />
                {t('groupGoalLabel')}
              </span>
            </label>
            {isGroup && <p className="text-xs text-textmuted mt-1.5">{t('groupGoalHint')}</p>}
            {isGroup && <p className="text-xs text-primary mt-1.5">{t('groupOwnerPinHint')}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-text">{t('target')}</label>
              <input
                type="number"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="input-field mt-1"
                placeholder="5000000"
              />
            </div>
            <div>
              <label className="label-text">{tc('currency')}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="input-field mt-1"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">{t('deadline')} <span className="text-textmuted font-normal">({t('optional')})</span></label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input-field mt-1"
              />
            </div>
          </div>
          {!isGroup && (
          <div>
            <label className="label-text">{t('lockDuration')}</label>
            <select
              value={lockDateMode === 'custom' ? 'custom' : lockDays}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setLockDateMode('custom');
                } else {
                  setLockDateMode('preset');
                  setLockDays(e.target.value);
                }
              }}
              className="input-field mt-1"
            >
              <option value="">{t('noLock')}</option>
              <option value="30">{t('days30')}</option>
              <option value="60">{t('days60')}</option>
              <option value="90">{t('days90')}</option>
              <option value="custom">{t('customDate')}</option>
            </select>
            {lockDateMode === 'custom' && (
              <input
                type="date"
                required
                min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                value={customLockDate}
                onChange={(e) => setCustomLockDate(e.target.value)}
                className="input-field mt-2"
              />
            )}
          </div>
          )}
          <div>
            <p className="text-xs text-textmuted mb-2">{isGroup ? t('groupPinHint') : t('setPinHint')}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">{t('setPinLabel')}</label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  name="new-goal-pin"
                  required
                  value={createPin}
                  onChange={(e) => setCreatePin(e.target.value)}
                  className="input-field mt-1"
                  placeholder={t('pinPlaceholder')}
                  maxLength={32}
                />
              </div>
              <div>
                <label className="label-text">{t('confirmPinLabel')}</label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  name="new-goal-pin-confirm"
                  required
                  value={createPinConfirm}
                  onChange={(e) => setCreatePinConfirm(e.target.value)}
                  className="input-field mt-1"
                  placeholder={t('pinPlaceholder')}
                  maxLength={32}
                />
              </div>
            </div>
            {createPinError && <p className="text-xs text-danger mt-1.5">{createPinError}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              {tc('cancel')}
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? <Loader2 className="animate-spin" size={16} /> : tc('save')}
            </button>
          </div>
        </form>
      )}

      {pageError && (
        <div className="glass-card border border-danger/20 bg-danger/5 px-4 py-3 mb-4 text-sm text-danger">
          {pageError}
        </div>
      )}

      {loading ? (
        <div className="glass-card p-10 text-center text-sm text-textmuted">{tc('loading')}</div>
      ) : goals.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <img src="/maqsadlar.png" alt="" className="h-32 w-32 mx-auto mb-4 object-contain rounded-2xl" />
          <p className="font-semibold text-textmain">{t('noGoals')}</p>
          <p className="text-sm text-textmuted mt-1">{t('noGoalsSubtitle')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {goals.map((goal) => {
            const goalAdvice = advice[goal.id];
            const goalCurrency = goal.currency || user?.currency || 'UZS';
            const timeLocked = !!goal.locked_until && new Date(goal.locked_until) > new Date();
            const daysLeft = timeLocked
              ? Math.max(1, Math.ceil((new Date(goal.locked_until as string).getTime() - Date.now()) / 86400000))
              : 0;
            return (
              <div key={goal.id} className="glass-card overflow-hidden">
                {goal.image_url && (
                  <div className="h-32 w-full overflow-hidden bg-textmain/[0.04] relative">
                    <img
                      src={goal.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemovePhoto(goal.id); }}
                      aria-label={t('removePhoto')}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur flex items-center justify-center transition-colors"
                    >
                      <X size={13} className="text-white" />
                    </button>
                    {timeLocked && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10 flex flex-col items-center justify-center gap-1.5">
                        <span className="h-9 w-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center">
                          <Lock size={16} className="text-white" />
                        </span>
                        <p className="text-xs font-semibold text-white">{t('daysLeftLabel', { days: daysLeft })}</p>
                      </div>
                    )}
                  </div>
                )}
                <div
                  className={`p-5 ${allocateFor !== goal.id && withdrawFor !== goal.id && !goal.is_completed ? 'cursor-pointer' : ''}`}
                  onClick={() => {
                    if (allocateFor === goal.id || withdrawFor === goal.id || goal.is_completed) return;
                    openAllocate(goal);
                  }}
                >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-11 w-11 rounded-xl overflow-hidden shrink-0 relative bg-textmain/[0.04]">
                      <img src="/box.png" alt="" className="h-full w-full object-contain" />
                      {timeLocked && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Lock size={12} className="text-white" />
                        </span>
                      )}
                      {pendingConfirmationGoalIds.has(goal.id) && (
                        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-danger border-2 border-surface animate-pulse" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="font-display font-semibold text-textmain truncate">{goal.title}</h2>
                        {goal.is_group && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-secondary bg-secondary/10 rounded-full px-1.5 py-0.5">
                            <Users size={10} />
                            {t('groupBadge')}
                          </span>
                        )}
                      </div>
                      {goal.deadline && (
                        <p className="text-xs text-textmuted mt-0.5">{t('deadline')}: {goal.deadline}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(goal); }}
                    disabled={deletingId === goal.id}
                    className="text-textmuted hover:text-danger transition-colors shrink-0 disabled:opacity-50"
                    aria-label={tc('delete')}
                  >
                    {deletingId === goal.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-semibold text-textmain tabular-nums">
                      {formatCurrency(goal.current_amount, goalCurrency)}
                    </span>
                    <span className="text-textmuted tabular-nums">
                      / {formatCurrency(goal.target_amount, goalCurrency)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-textmain/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        goal.is_completed
                          ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500'
                          : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(goal.progress_percent, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-textmuted">{goal.progress_percent}%</p>
                    {goal.is_completed ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                        {t('completed')}
                      </span>
                    ) : goal.is_locked && (
                      <span className="flex items-center gap-1 text-xs font-medium text-primary">
                        <Lock size={11} />
                        {t('locked')}
                      </span>
                    )}
                  </div>
                </div>

                {goal.is_completed ? (
                  goal.is_group ? (
                    <div className="mt-4 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openMembers(goal)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-white font-semibold px-4 py-2.5 text-sm hover:brightness-105 transition-all"
                      >
                        <Users size={14} />
                        {t('members')}
                      </button>
                      <button
                        onClick={() => openMembers(goal, true)}
                        className="w-full text-xs font-medium text-textmuted hover:text-danger transition-colors"
                      >
                        {t('requestMyShare')}
                      </button>
                      {goal.current_amount > 0 && (
                        <button
                          onClick={() => openMembers(goal, false, true)}
                          className="w-full text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
                        >
                          {t('collectAllLabel')}
                        </button>
                      )}
                    </div>
                  ) : timeLocked ? (
                    <div className="mt-4 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                      <p className="w-full text-xs font-medium text-textmuted flex items-center justify-center gap-1">
                        <Lock size={12} />
                        {t('daysLeftLabel', { days: daysLeft })}
                      </p>
                      <button
                        onClick={() => openUnlockRequest(goal.id)}
                        disabled={unlockRequestSentFor === goal.id}
                        className="w-full text-[11px] font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                      >
                        {unlockRequestSentFor === goal.id ? t('unlockRequestSent') : t('contactSupportUnlock')}
                      </button>
                    </div>
                  ) : withdrawFor === goal.id ? (
                    <div className="mt-4 space-y-2.5 bg-amber-50 rounded-xl p-3.5 border border-amber-200" onClick={(e) => e.stopPropagation()}>
                      <p className="text-xs text-textmuted">{t('withdrawHint')}</p>
                      <div>
                        <label className="label-text">{t('enterPinLabel')}</label>
                        <PinField
                          name="withdraw-pin-completed"
                          autoFocus
                          value={withdrawPin}
                          onChange={setWithdrawPin}
                          placeholder={t('pinPlaceholder')}
                        />
                      </div>
                      {withdrawError && <p className="text-xs text-danger">{withdrawError}</p>}
                      {forgotPinSentFor === goal.id ? (
                        <p className="text-xs text-primary font-medium">{t('forgotPinSent')}</p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleForgotPin(goal.id)}
                          disabled={forgotPinSubmitting}
                          className="text-xs font-medium text-textmuted hover:text-primary transition-colors disabled:opacity-50"
                        >
                          {t('forgotPin')}
                        </button>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleWithdraw(goal.id)}
                          disabled={submitting}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-white font-semibold px-4 py-2.5 flex-1 text-sm hover:brightness-95 transition-all"
                        >
                          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
                          {t('withdraw')}
                        </button>
                        <button onClick={() => setWithdrawFor(null)} className="btn-secondary px-2.5">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); openWithdraw(goal.id); }}
                      className="w-full mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-white font-semibold px-4 py-2.5 text-sm hover:brightness-105 transition-all"
                    >
                      <Unlock size={14} />
                      {t('withdraw')}
                    </button>
                  )
                ) : allocateFor === goal.id ? (
                  <div className="mt-4 space-y-2.5 bg-textmain/[0.03] rounded-xl p-3.5" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <label className="label-text">{t('amountLabel')}</label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="number"
                          autoFocus
                          value={fundsAmount}
                          onChange={(e) => setFundsAmount(e.target.value)}
                          className="input-field flex-1 min-w-0"
                          placeholder="100000"
                        />
                        <select
                          value={fundsCurrency}
                          onChange={(e) => setFundsCurrency(e.target.value)}
                          className="input-field w-24"
                        >
                          {CURRENCIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      {fundsCurrency !== goalCurrency && fundsAmount && !isNaN(parseFloat(fundsAmount)) && (
                        <p className="text-xs text-textmuted mt-1">
                          ≈ {formatCurrency(convertBetween(parseFloat(fundsAmount), fundsCurrency, goalCurrency), goalCurrency)}
                        </p>
                      )}
                    </div>
                    {!goal.has_pin && !goal.is_group && (
                      <>
                        <p className="text-xs text-textmuted">{t('setPinHint')}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="label-text">{t('setPinLabel')}</label>
                            <input
                              type="password"
                              inputMode="numeric"
                              autoComplete="new-password"
                              name="legacy-goal-pin"
                              value={legacyPin}
                              onChange={(e) => setLegacyPin(e.target.value)}
                              className="input-field mt-1"
                              placeholder={t('pinPlaceholder')}
                              maxLength={32}
                            />
                          </div>
                          <div>
                            <label className="label-text">{t('confirmPinLabel')}</label>
                            <input
                              type="password"
                              inputMode="numeric"
                              autoComplete="new-password"
                              name="legacy-goal-pin-confirm"
                              value={legacyPinConfirm}
                              onChange={(e) => setLegacyPinConfirm(e.target.value)}
                              className="input-field mt-1"
                              placeholder={t('pinPlaceholder')}
                              maxLength={32}
                            />
                          </div>
                        </div>
                      </>
                    )}
                    {allocateError && <p className="text-xs text-danger">{allocateError}</p>}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleAllocate(goal)}
                        disabled={submitting}
                        className="btn-primary flex-1 text-sm"
                      >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : tc('save')}
                      </button>
                      <button onClick={() => setAllocateFor(null)} className="btn-secondary px-2.5">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : withdrawFor === goal.id ? (
                  <div className="mt-4 space-y-2.5 bg-danger/5 rounded-xl p-3.5 border border-danger/10">
                    <p className="text-xs text-textmuted">
                      {deleteIntentFor === goal.id ? t('withdrawBeforeDeleteHint') : t('withdrawHint')}
                    </p>
                    <div>
                      <label className="label-text">{t('enterPinLabel')}</label>
                      <PinField
                        name="withdraw-pin"
                        autoFocus
                        value={withdrawPin}
                        onChange={setWithdrawPin}
                        placeholder={t('pinPlaceholder')}
                      />
                    </div>
                    {withdrawError && <p className="text-xs text-danger">{withdrawError}</p>}
                    {forgotPinSentFor === goal.id ? (
                      <p className="text-xs text-primary font-medium">{t('forgotPinSent')}</p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleForgotPin(goal.id)}
                        disabled={forgotPinSubmitting}
                        className="text-xs font-medium text-textmuted hover:text-primary transition-colors disabled:opacity-50"
                      >
                        {t('forgotPin')}
                      </button>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleWithdraw(goal.id)}
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-danger text-white font-medium px-4 py-2.5 flex-1 text-sm hover:brightness-95 transition-all"
                      >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
                        {t('withdraw')}
                      </button>
                      <button onClick={() => { setWithdrawFor(null); setDeleteIntentFor(null); }} className="btn-secondary px-2.5">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openAllocate(goal)} className="btn-secondary flex-1 text-sm">
                        <Plus size={14} />
                        {goal.is_locked ? t('addMore') : t('allocate')}
                      </button>
                      {goal.is_group ? (
                        <button onClick={() => openMembers(goal)} className="btn-secondary flex-1 text-sm text-secondary border-secondary/20">
                          <Users size={14} />
                          {t('members')}
                        </button>
                      ) : (
                        <button
                          onClick={() => getAdvice(goal)}
                          disabled={goalAdvice?.loading}
                          className="btn-secondary flex-1 text-sm text-primary border-primary/20"
                        >
                          {goalAdvice?.loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                          {t('aiAdvice')}
                        </button>
                      )}
                    </div>
                    {goal.is_group && (
                      <div className="flex flex-col gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                        {/* Suhbat — prominent chat button visible on the card itself */}
                        <button
                          onClick={() => openFullscreenChat(goal)}
                          className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition-all"
                          style={{ background: 'linear-gradient(135deg,#2AABEE22,#2AABEE11)', border: '1px solid #2AABEE44', color: '#2AABEE' }}
                        >
                          <MessageCircle size={14} />
                          {t('chatTitle')}
                        </button>
                        <div className="flex items-center justify-center gap-3">
                          {goal.current_amount > 0 && (
                            <>
                              <button
                                onClick={() => openMembers(goal, true)}
                                className="text-xs font-medium text-textmuted hover:text-danger transition-colors flex items-center justify-center gap-1"
                              >
                                <Unlock size={12} />
                                {t('requestMyShare')}
                              </button>
                              <span className="text-textmuted/30">·</span>
                              <button
                                onClick={() => openMembers(goal, false, true)}
                                className="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors flex items-center justify-center gap-1"
                              >
                                <Unlock size={12} />
                                {t('collectAllLabel')}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {!goal.is_group && goal.is_locked && (
                      timeLocked ? (
                        <div className="mt-2 space-y-1" onClick={(e) => e.stopPropagation()}>
                          <p className="w-full text-xs font-medium text-textmuted flex items-center justify-center gap-1">
                            <Lock size={12} />
                            {t('daysLeftLabel', { days: daysLeft })}
                          </p>
                          <button
                            onClick={() => openUnlockRequest(goal.id)}
                            disabled={unlockRequestSentFor === goal.id}
                            className="w-full text-[11px] font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                          >
                            {unlockRequestSentFor === goal.id ? t('unlockRequestSent') : t('contactSupportUnlock')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteIntentFor(null); openWithdraw(goal.id); }}
                          className="w-full mt-2 text-xs font-medium text-textmuted hover:text-danger transition-colors flex items-center justify-center gap-1"
                        >
                          <Unlock size={12} />
                          {t('withdraw')}
                        </button>
                      )
                    )}
                  </>
                )}

                {goalAdvice?.text && (
                  <p className="text-sm text-textmuted mt-3 bg-primary/5 rounded-lg p-3 border border-primary/10">
                    {goalAdvice.text}
                  </p>
                )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Confirm allocate - themed modal instead of the native browser confirm() */}
      {confirmingAllocate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-textmain/20 p-4" onClick={() => setConfirmingAllocate(null)}>
          <div className="glass-card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display font-semibold text-textmain mb-2">{tc('confirm')}</h2>
            <p className="text-sm text-textmuted">
              {t('confirmAllocate', {
                amount: formatCurrency(confirmingAllocate.amount, confirmingAllocate.goal.currency || user?.currency || 'UZS'),
                goal: confirmingAllocate.goal.title,
              })}
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmingAllocate(null)} className="btn-secondary">{tc('cancel')}</button>
              <button onClick={submitAllocate} disabled={submitting} className="btn-primary">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : tc('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Request early unlock (sent to admin for approval) */}
      {unlockRequestFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-textmain/20 p-4" onClick={() => setUnlockRequestFor(null)}>
          <div className="glass-card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display font-semibold text-textmain mb-1">{t('unlockRequestTitle')}</h2>
            <p className="text-xs text-textmuted mb-4">{t('unlockRequestHint')}</p>
            <textarea
              autoFocus
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              placeholder={t('unlockRequestPlaceholder')}
              rows={3}
              className="input-field resize-none"
            />
            {unlockRequestError && <p className="text-xs text-danger mt-2">{unlockRequestError}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setUnlockRequestFor(null)} className="btn-secondary">{tc('cancel')}</button>
              <button
                onClick={() => submitUnlockRequest(unlockRequestFor)}
                disabled={unlockRequestSubmitting || unlockReason.trim().length < 2}
                className="btn-primary"
              >
                {unlockRequestSubmitting ? <Loader2 size={16} className="animate-spin" /> : t('unlockRequestSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Members: view/invite/request-own-share for a group goal */}
      {membersFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-textmain/20 p-4" onClick={() => setMembersFor(null)}>
          <div className="glass-card p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display font-semibold text-textmain">{t('membersTitle')}</h2>
              <button onClick={() => setMembersFor(null)} className="text-textmuted hover:text-textmain">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-textmuted mb-4 truncate">{membersFor.title}</p>

            {false && chatOpen && (
              <div className="border border-textmain/10 rounded-xl mb-4 flex flex-col overflow-hidden">
                <div className="h-56 overflow-y-auto p-3 space-y-2">
                  {messagesLoading ? (
                    <p className="text-xs text-textmuted text-center py-6">{tc('loading')}</p>
                  ) : messages.length === 0 ? (
                    <p className="text-xs text-textmuted text-center py-6">{t('chatEmpty')}</p>
                  ) : (
                    messages.map((m) => {
                      const mine = m.user_id === user?.id;
                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 ${mine ? 'bg-primary text-white' : 'bg-textmain/[0.06] text-textmain'}`}>
                            <p className="text-[10px] font-semibold opacity-70">{m.full_name}</p>
                            <p className="text-sm break-words">{m.body}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="flex items-center gap-2 border-t border-textmain/10 p-2">
                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    placeholder={t('chatPlaceholder')}
                    className="input-field flex-1 text-sm py-1.5"
                    maxLength={2000}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sendingMessage || newMessage.trim().length === 0}
                    className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-40 shrink-0"
                  >
                    {sendingMessage ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </div>
            )}

            {membersLoading ? (
              <p className="text-sm text-textmuted text-center py-6">{tc('loading')}</p>
            ) : (
              <div className="space-y-1 mb-4">
                {members.map((m) => (
                  <div key={m.user_id} className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-textmain/[0.03]">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-textmain truncate flex items-center gap-1.5">
                        {m.full_name}
                        {m.is_owner && (
                          <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
                            {t('ownerBadge')}
                          </span>
                        )}
                        {m.status === 'pending' && (
                          <span className="text-[10px] font-semibold text-textmuted bg-textmain/[0.06] rounded-full px-1.5 py-0.5">
                            {t('pendingBadge')}
                          </span>
                        )}
                        {m.user_id === user?.id && (
                          <span className="text-[10px] font-semibold text-secondary bg-secondary/10 rounded-full px-1.5 py-0.5">
                            {t('youBadge')}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-textmuted truncate">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold tabular-nums text-textmain">
                        {formatCurrency(m.contributed_amount, membersFor.currency)}
                      </span>
                      {membersFor.user_id === user?.id && m.user_id !== user?.id && m.contributed_amount === 0 && (
                        <button onClick={() => handleRemoveMember(m.user_id)} className="text-textmuted hover:text-danger">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Withdrawal requests waiting on my confirmation - computed
                once so the header and the list below it can never disagree
                about whether there's actually anything to show (that
                mismatch used to leave a "Tasdiqlashingiz kerak" heading
                with nothing rendered under it, whenever a request existed
                that wasn't mine to confirm - already decided, or no
                confirmation row for me at all). */}
            {(() => {
              const actionable = withdrawRequests.filter((r) => {
                if (r.user_id === user?.id) return false;
                const mine = r.confirmations.find((c) => c.user_id === user?.id);
                return !!mine && mine.decision === 'pending';
              });
              if (actionable.length === 0) return null;
              return (
                <div className="space-y-2 mb-4 border-t border-textmain/10 pt-4">
                  <p className="label-text">{t('pendingConfirmations')}</p>
                  {actionable.map((r) => {
                    const requester = members.find((m) => m.user_id === r.user_id);
                    const isCollectAll = r.request_type === 'collect_all';
                    return (
                      <div key={r.id} className={`rounded-xl p-3 ${isCollectAll ? 'bg-amber-50 border border-amber-200' : 'bg-textmain/[0.03]'}`}>
                        <p className="text-sm text-textmain">
                          {isCollectAll
                            ? t('memberWantsToCollectAll', { name: requester?.full_name || '', amount: formatCurrency(r.amount, r.currency) })
                            : t('memberWantsToWithdraw', { name: requester?.full_name || '', amount: formatCurrency(r.amount, r.currency) })}
                        </p>
                        {r.reason && <p className="text-xs text-textmuted mt-1 italic">"{r.reason}"</p>}
                        <div className="mt-2">
                          <PinField
                            name={`confirm-pin-${r.id}`}
                            value={confirmPins[r.id] || ''}
                            onChange={(v) => setConfirmPins((prev) => ({ ...prev, [r.id]: v }))}
                            placeholder={t('enterConfirmPinLabel')}
                          />
                          {confirmPinErrors[r.id] && <p className="text-xs text-danger mt-1">{confirmPinErrors[r.id]}</p>}
                          {forgotConfirmPinSentFor === membersFor.id ? (
                            <p className="text-xs text-primary font-medium mt-1">{t('forgotPinSent')}</p>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleForgotConfirmPin(membersFor.id)}
                              disabled={forgotConfirmPinSubmitting}
                              className="text-xs font-medium text-textmuted hover:text-primary transition-colors disabled:opacity-50 mt-1"
                            >
                              {t('forgotPin')}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2.5">
                          <button
                            onClick={() => handleConfirmWithdraw(r.id, true, confirmPins[r.id])}
                            disabled={confirmingId === r.id || (confirmPins[r.id] || '').length < 4}
                            className={`flex-1 text-xs py-1.5 ${isCollectAll ? 'inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-white font-semibold hover:brightness-95 transition-all' : 'btn-primary'}`}
                          >
                            {confirmingId === r.id ? <Loader2 size={13} className="animate-spin" /> : t('confirmApprove')}
                          </button>
                          <button
                            onClick={() => handleConfirmWithdraw(r.id, false)}
                            disabled={confirmingId === r.id}
                            className="btn-secondary flex-1 text-xs py-1.5 text-danger border-danger/20"
                          >
                            {t('confirmReject')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* My own pending request's live status - previously this only
                ever showed right after submitting (transient local state),
                so closing and reopening the modal (or another member
                confirming while I wasn't looking) showed nothing at all
                about where things stood. */}
            {(() => {
              const mine = withdrawRequests.find((r) => r.user_id === user?.id);
              if (!mine) return null;
              const others = mine.confirmations;
              const approvedCount = others.filter((c) => c.decision === 'approved').length;
              return (
                <div className="rounded-xl p-3 mb-4 bg-primary/5 border border-primary/10">
                  <p className="text-sm font-medium text-textmain">
                    {mine.request_type === 'collect_all' ? t('collectAllRequestSent') : t('unlockRequestSent')}
                  </p>
                  <p className="text-xs text-textmuted mt-1">
                    {t('confirmationsProgress', { approved: approvedCount, total: others.length })}
                  </p>
                  <div className="space-y-1 mt-2">
                    {others.map((c) => (
                      <div key={c.user_id} className="flex items-center justify-between text-xs">
                        <span className="text-textmuted">{c.full_name}</span>
                        <span
                          className={
                            c.decision === 'approved'
                              ? 'text-primary font-medium'
                              : c.decision === 'rejected'
                                ? 'text-danger font-medium'
                                : 'text-textmuted'
                          }
                        >
                          {c.decision === 'approved' ? t('confirmApprove') : c.decision === 'rejected' ? t('confirmReject') : t('pendingBadge')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Fallback: a pending request exists on this goal but it's
                neither mine nor one I need to confirm (e.g. I wasn't yet an
                accepted member when it was created) - without this, the
                request/collect-all triggers below just silently disappear
                (both are gated on "no pending request") with no explanation
                at all for why. */}
            {(() => {
              const mine = withdrawRequests.find((r) => r.user_id === user?.id);
              const actionableIds = new Set(
                withdrawRequests
                  .filter((r) => r.user_id !== user?.id)
                  .filter((r) => {
                    const c = r.confirmations.find((c) => c.user_id === user?.id);
                    return !!c && c.decision === 'pending';
                  })
                  .map((r) => r.id)
              );
              const orphaned = withdrawRequests.filter((r) => r.id !== mine?.id && !actionableIds.has(r.id));
              if (orphaned.length === 0) return null;
              return (
                <div className="rounded-xl p-3 mb-4 bg-textmain/[0.03] border border-textmain/10">
                  {orphaned.map((r) => {
                    const requester = members.find((m) => m.user_id === r.user_id);
                    return (
                      <p key={r.id} className="text-xs text-textmuted">
                        {t('pendingRequestBlocking', {
                          name: requester?.full_name || '',
                          amount: formatCurrency(r.amount, r.currency),
                        })}
                      </p>
                    );
                  })}
                </div>
              );
            })()}

            {/* Owner: invite someone new */}
            {membersFor.user_id === user?.id && (
              <div className="border-t border-textmain/10 pt-4 mb-1">
                <label className="label-text">{t('inviteLabel')}</label>
                <div className="flex gap-2 mt-1">
                  <input
                    value={inviteIdentifier}
                    onChange={(e) => setInviteIdentifier(e.target.value)}
                    placeholder={t('invitePlaceholder')}
                    className="input-field flex-1"
                  />
                  <button
                    onClick={handleInvite}
                    disabled={inviteSubmitting || inviteIdentifier.trim().length < 3}
                    className="btn-primary px-3"
                  >
                    {inviteSubmitting ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                  </button>
                </div>
                {inviteError && <p className="text-xs text-danger mt-1.5">{inviteError}</p>}
              </div>
            )}

            {/* Anyone: request their own share back - always admin-approved.
                Hidden while any request is pending (own or someone else's) -
                the status card above already shows what's happening instead. */}
            {(() => {
              const mine = members.find((m) => m.user_id === user?.id);
              if (!mine || mine.contributed_amount <= 0) return null;
              if (withdrawRequests.length > 0) return null;
              return (
                <div className="border-t border-textmain/10 pt-4 mt-1">
                  {memberWithdrawOpen ? (
                    <div className="space-y-2.5">
                      <div>
                        <label className="label-text">{t('amountLabel')} ({t('yourShare')}: {formatCurrency(mine.contributed_amount, membersFor.currency)})</label>
                        <input
                          type="number"
                          autoFocus
                          max={mine.contributed_amount}
                          value={memberWithdrawAmount}
                          onChange={(e) => setMemberWithdrawAmount(e.target.value)}
                          className="input-field mt-1"
                          placeholder={String(mine.contributed_amount)}
                        />
                      </div>
                      <textarea
                        value={memberWithdrawReason}
                        onChange={(e) => setMemberWithdrawReason(e.target.value)}
                        placeholder={`${t('unlockRequestPlaceholder')} (${t('optional')})`}
                        rows={2}
                        className="input-field resize-none"
                      />
                      {memberWithdrawError && <p className="text-xs text-danger">{memberWithdrawError}</p>}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleMemberWithdrawRequest}
                          disabled={memberWithdrawSubmitting}
                          className="btn-primary flex-1 text-sm"
                        >
                          {memberWithdrawSubmitting ? <Loader2 size={14} className="animate-spin" /> : t('unlockRequestSubmit')}
                        </button>
                        <button onClick={() => setMemberWithdrawOpen(false)} className="btn-secondary px-2.5">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setMemberWithdrawOpen(true); setMemberWithdrawAmount(String(mine.contributed_amount)); }}
                      className="w-full text-sm font-medium text-textmuted hover:text-danger transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Unlock size={13} />
                      {t('requestMyShare')}
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Anyone: request to collect the ENTIRE box, not just their own
                share - gated the same way (one pending request at a time,
                and there has to actually be money in the box), but
                confirming this one needs each member's own PIN. Hidden
                while any request is pending, same as the own-share trigger
                above - the status card covers that case instead. */}
            {membersFor.current_amount > 0 && withdrawRequests.length === 0 && (
              <div className="border-t border-textmain/10 pt-4 mt-1">
                {collectAllOpen ? (
                  <div className="space-y-2.5">
                    <p className="text-xs text-textmuted">{t('collectAllHint')}</p>
                    <textarea
                      autoFocus
                      value={collectAllReason}
                      onChange={(e) => setCollectAllReason(e.target.value)}
                      placeholder={`${t('collectAllReasonPlaceholder')} (${t('optional')})`}
                      rows={2}
                      className="input-field resize-none"
                    />
                    {collectAllError && <p className="text-xs text-danger">{collectAllError}</p>}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCollectAllRequest}
                        disabled={collectAllSubmitting}
                        className="flex-1 text-sm py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-white font-semibold hover:brightness-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        {collectAllSubmitting ? <Loader2 size={14} className="animate-spin" /> : t('unlockRequestSubmit')}
                      </button>
                      <button onClick={() => setCollectAllOpen(false)} className="btn-secondary px-2.5">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setCollectAllOpen(true)}
                    className="w-full text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Unlock size={13} />
                    {t('collectAllLabel')}
                  </button>
                )}
              </div>
            )}

            {/* Chat — TG-style group chat, below all action sections */}
            <div className="border-t border-textmain/10 pt-3 mt-2">
              <button
                onClick={toggleChat}
                className={`w-full h-9 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                  chatOpen ? 'bg-primary text-white' : 'text-primary bg-primary/10 hover:bg-primary/15'
                }`}
              >
                <MessageCircle size={15} />
                {t('chatTitle')}
              </button>

              {chatOpen && (() => {
                // Assign a stable color to each unique sender so their avatar + name stay the same hue throughout the thread
                const AVATAR_COLORS: [string, string][] = [
                  ['#2AABEE','#1a8bc4'], // TG blue
                  ['#8B5CF6','#6d3fc4'], // purple
                  ['#10B981','#0a8f63'], // green
                  ['#F59E0B','#c47f09'], // amber
                  ['#EF4444','#c02020'], // red
                  ['#EC4899','#c0207a'], // pink
                  ['#06B6D4','#0591a8'], // cyan
                ];
                const colorMap: Record<string, [string,string]> = {};
                let colorIdx = 0;
                messages.forEach((m) => {
                  if (!colorMap[m.user_id]) {
                    colorMap[m.user_id] = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length];
                    colorIdx++;
                  }
                });

                // Group consecutive messages by the same sender so we only
                // show the avatar + name on the FIRST bubble of each run
                type MsgGroup = { userId: string; fullName: string; msgs: typeof messages };
                const groups: MsgGroup[] = [];
                messages.forEach((m) => {
                  const last = groups[groups.length - 1];
                  if (last && last.userId === m.user_id) {
                    last.msgs.push(m);
                  } else {
                    groups.push({ userId: m.user_id, fullName: m.full_name, msgs: [m] });
                  }
                });

                function fmtTime(iso: string) {
                  const d = new Date(iso);
                  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
                function fmtDate(iso: string) {
                  const d = new Date(iso);
                  const today = new Date();
                  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
                  if (d.toDateString() === today.toDateString()) return 'Bugun';
                  if (d.toDateString() === yesterday.toDateString()) return 'Kecha';
                  return d.toLocaleDateString([], { day: 'numeric', month: 'long' });
                }

                // Collect date-separator positions (one per calendar day)
                const dateSeparators: Record<string, boolean> = {};
                messages.forEach((m) => {
                  const key = new Date(m.created_at).toDateString();
                  if (!dateSeparators[key]) dateSeparators[key] = true;
                });
                const shownDates = new Set<string>();

                return (
                  <div className="mt-3 rounded-2xl overflow-hidden flex flex-col" style={{ background: 'var(--color-surface, #1a1a2e)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {/* TG-style header bar */}
                    <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
                      <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#2AABEE,#1a6fa8)' }}>
                        <Users size={14} className="text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-textmain truncate">{membersFor.title}</p>
                        <p className="text-[10px] text-textmuted">{members.filter(m => m.status === 'accepted').length} a'zo</p>
                      </div>
                    </div>

                    {/* Messages area */}
                    <div
                      className="overflow-y-auto px-3 py-3 space-y-[2px]"
                      style={{ height: '320px', background: 'var(--tg-chat-bg, rgba(0,0,0,0.25))' }}
                    >
                      {messagesLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 size={20} className="animate-spin text-textmuted" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <MessageCircle size={20} className="text-primary" />
                          </div>
                          <p className="text-xs text-textmuted text-center">{t('chatEmpty')}</p>
                        </div>
                      ) : (
                        groups.map((grp, gi) => {
                          const mine = grp.userId === user?.id;
                          const [avatarBg] = colorMap[grp.userId] || ['#888','#666'];
                          const initials = grp.fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

                          return (
                            <div key={gi} className={`flex items-end gap-1.5 mt-3 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
                              {/* Avatar — shown once per group on the left/right */}
                              {!mine ? (
                                <div
                                  className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white mb-0.5"
                                  style={{ background: avatarBg }}
                                >
                                  {initials}
                                </div>
                              ) : (
                                <div className="w-7 shrink-0" />
                              )}

                              {/* Bubble column */}
                              <div className={`flex flex-col gap-0.5 max-w-[75%] ${mine ? 'items-end' : 'items-start'}`}>
                                {/* Sender name — only for others, only on first bubble */}
                                {!mine && (
                                  <p className="text-[10px] font-semibold px-1" style={{ color: avatarBg }}>
                                    {grp.fullName}
                                  </p>
                                )}

                                {grp.msgs.map((m, mi) => {
                                  const dateKey = new Date(m.created_at).toDateString();
                                  const showDate = !shownDates.has(dateKey);
                                  if (showDate) shownDates.add(dateKey);
                                  const isLast = mi === grp.msgs.length - 1;

                                  return (
                                    <div key={m.id}>
                                      {showDate && (
                                        <div className="flex items-center justify-center my-3">
                                          <span className="text-[10px] text-textmuted px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                            {fmtDate(m.created_at)}
                                          </span>
                                        </div>
                                      )}
                                      <div
                                        className="px-2.5 py-1.5 text-sm break-words"
                                        style={{
                                          background: mine
                                            ? 'linear-gradient(135deg,#2AABEE,#1a8bc4)'
                                            : 'rgba(255,255,255,0.08)',
                                          color: mine ? '#fff' : 'var(--color-textmain, #f0f0f0)',
                                          borderRadius: mine
                                            ? (mi === 0 ? '16px 4px 16px 16px' : isLast ? '4px 16px 16px 16px' : '4px 4px 16px 16px')
                                            : (mi === 0 ? '4px 16px 16px 16px' : isLast ? '16px 4px 4px 16px' : '4px 4px 4px 16px'),
                                        }}
                                      >
                                        {m.body}
                                        {isLast && (
                                          <span className="inline-block ml-2 text-[9px] opacity-60 align-bottom whitespace-nowrap">{fmtTime(m.created_at)}</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* TG-style input bar */}
                    <div
                      className="flex items-center gap-2 px-2 py-2"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
                    >
                      <input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        placeholder={t('chatPlaceholder')}
                        maxLength={2000}
                        className="flex-1 text-sm bg-transparent outline-none text-textmain placeholder:text-textmuted px-1"
                        style={{ minWidth: 0 }}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={sendingMessage || newMessage.trim().length === 0}
                        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
                        style={{ background: newMessage.trim().length > 0 ? 'linear-gradient(135deg,#2AABEE,#1a8bc4)' : 'rgba(255,255,255,0.08)' }}
                      >
                        {sendingMessage
                          ? <Loader2 size={14} className="animate-spin text-white" />
                          : <Send size={14} className="text-white" style={{ marginLeft: '1px' }} />}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      {/* Full-screen TG-style chat overlay - shared component, also used
          by the dashboard's compact group card. */}
      {fullscreenChatGoal && (
        <GoalChatOverlay goal={fullscreenChatGoal} onClose={() => setFullscreenChatGoal(null)} />
      )}
    </AppShell>
  );
}
