const MAX_SUBSTEP = 1 / 120;
const REST = 1e-3;

/**
 * A damped spring that chases a target. Figures set targets every frame and read `value`;
 * the runner steps every spring after the frame is drawn and stops when all of them rest.
 */
export class Spring {
  value: number;
  target: number;
  velocity = 0;

  constructor(
    initial = 0,
    private readonly stiffness = 170,
    private readonly damping = 26,
  ) {
    this.value = this.target = initial;
  }

  /** Sets the target and returns the spring, so `spring.to(x).value` reads well. */
  to(target: number): this {
    this.target = target;
    return this;
  }

  /** Jumps straight to a value, with no motion. Used by looping states that drive values directly. */
  set(value: number): this {
    this.value = this.target = value;
    this.velocity = 0;
    return this;
  }

  get resting(): boolean {
    return this.velocity === 0 && this.value === this.target;
  }

  step(dt: number): void {
    if (this.resting) return;
    let remaining = dt;
    while (remaining > 0) {
      const h = Math.min(remaining, MAX_SUBSTEP);
      const acceleration = this.stiffness * (this.target - this.value) - this.damping * this.velocity;
      this.velocity += acceleration * h;
      this.value += this.velocity * h;
      remaining -= h;
    }
    if (Math.abs(this.velocity) < REST && Math.abs(this.target - this.value) < REST) {
      this.value = this.target;
      this.velocity = 0;
    }
  }
}
