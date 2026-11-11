import { FLIGHT_CONFIG } from '../flightConfig';
import { PLAYER_CONFIG } from '../playerConfig';
export const DIVER_HP = 1;
export const DIVER_SPEED = 160;
export const DIVER_SCORE = 150;
export const DIVER_DIVE_SPEED = 420;
export const DODGER_HP = 2;
export const DODGER_SPEED = 90;
export const DODGER_SCORE = 300;
export const DODGER_FIRE_RATE = 2600;
export const DODGER_STRAFE_SPEED = 240;
export const DODGER_STRAFE_FLIP_MS = 900;
export const SOWER_HP = 3;
export const SOWER_SPEED = 45;
export const SOWER_SCORE = 350;
export const SOWER_MINE_COOLDOWN = 2600;

/** The rival flies the player's own hull at half strength; these halve the player's flight and guns. */
export const RIVAL_ACCELERATION = FLIGHT_CONFIG.acceleration / 2;
export const RIVAL_MAX_SPEED = FLIGHT_CONFIG.maxSpeed / 2;
export const RIVAL_FIRE_RATE = PLAYER_CONFIG.baseFireRate * 2;
/** Player hits the rival's hull takes, whatever the damage tier: about nine seconds of a stock duel. */
export const RIVAL_HITS_TO_DEFEAT = 30;
export const RIVAL_SCORE = 1500;
export const RIVAL_ATTACK_MS = 1800;
export const RIVAL_EVADE_MS = 1100;
export const RIVAL_EVADE_OFFSET = 170;
export const RIVAL_TINT = 0xff6a7c;
export const COURIER_HP = 6;
export const COURIER_SPEED = 62;
export const COURIER_WEAVE_SPEED = 230;
export const COURIER_SCORE = 800;
export const COURIER_TINT = 0xffd76a;
