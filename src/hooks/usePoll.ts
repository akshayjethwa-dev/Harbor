// src/hooks/usePoll.ts
import { useEffect, useMemo, useState } from "react";
import {
  subscribeToPoll,
  subscribeToUserVote,
} from "../services/pollService";
import {
  DatePoll,
  VoteChoice,
  shouldRecreatePoll,
} from "../types/poll";

export function usePoll(pollId: string | null, userId: string | null) {
  const [poll, setPoll] = useState<DatePoll | null>(null);
  const [myVotes, setMyVotes] = useState<Record<string, VoteChoice> | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pollId) {
      setPoll(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToPoll(pollId, (p) => {
      setPoll(p);
      setLoading(false);
    });
    return () => unsub();
  }, [pollId]);

  useEffect(() => {
    if (!pollId || !userId) {
      setMyVotes(null);
      return;
    }
    const unsub = subscribeToUserVote(pollId, userId, setMyVotes);
    return () => unsub();
  }, [pollId, userId]);

  const needsNewPoll = useMemo(() => {
    if (!poll || poll.status !== "open") return false;
    return shouldRecreatePoll(poll.slots, poll.voteCounts ?? {});
  }, [poll]);

  const totalVotes = useMemo(() => {
    if (!poll) return 0;
    return Object.values(poll.voteCounts ?? {}).reduce(
      (sum, c) => sum + c.yes + c.maybe + c.no,
      0
    );
  }, [poll]);

  return { poll, myVotes, loading, needsNewPoll, totalVotes };
}