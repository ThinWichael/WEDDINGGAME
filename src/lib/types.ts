export type RoomStatus = "draft" | "waiting" | "playing" | "ended";
export type GamePhase = "waiting" | "answering" | "revealed" | "ended";
export type QuestionType = "yn" | "single";

export interface Room {
  roomId: string;
  name: string;
  status: RoomStatus;
  createdAt: string;
}

export interface Question {
  questionId: string;
  roomId: string;
  order: number;
  type: QuestionType;
  text: string;
  imageKey: string;
  options: string[];
  correctAnswer: string;
}

export interface GameState {
  roomId: string;
  currentQuestionId: string;
  phase: GamePhase;
  revealedAt: string;
  updatedAt: string;
}

export interface LiveCount {
  roomId: string;
  questionId: string;
  yesCount: number;
  noCount: number;
  optionACount: number;
  optionBCount: number;
  optionCCount: number;
  optionDCount: number;
}

export interface Guest {
  guestId: string;
  roomId: string;
  name: string;
  email: string;
  maritalStatus: string;
  joinCeremony: boolean;
  joinAfterParty: boolean;
  vegetarian: boolean;
  message: string;
  registeredAt: string;
}

export interface RegisterGuestInput {
  roomId: string;
  name: string;
  email: string;
  maritalStatus: string;
  joinCeremony: boolean;
  joinAfterParty: boolean;
  vegetarian: boolean;
  message: string;
}

export interface GuestAuthResult {
  guestId: string;
  roomId: string;
  name: string;
}

export interface GamePlayer {
  gamePlayerId: string;
  roomId: string;
  nickname: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface JoinGameInput {
  roomId: string;
  nickname: string;
  confirmExisting?: boolean;
}

export type JoinGameResult =
  | { conflict: true; nickname: string }
  | {
      conflict: false;
      reused: boolean;
      gamePlayerId: string;
      roomId: string;
      nickname: string;
    };
