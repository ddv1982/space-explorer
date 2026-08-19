const UNARMED: unique symbol = Symbol('unarmed');

export interface ArmingAction<T = undefined> {
  trigger(value?: T): boolean;
  cancel(): void;
  isArmed(value?: T): boolean;
}

export function createArmingAction<T = undefined>(onConfirm: (value: T) => void): ArmingAction<T> {
  let armed: T | typeof UNARMED = UNARMED;

  return {
    trigger(value: T = undefined as T) {
      if (!Object.is(armed, value)) {
        armed = value;
        return false;
      }

      armed = UNARMED;
      onConfirm(value);
      return true;
    },
    cancel() {
      armed = UNARMED;
    },
    isArmed(value?: T) {
      if (arguments.length === 0) {
        return armed !== UNARMED;
      }

      return Object.is(armed, value);
    },
  };
}
