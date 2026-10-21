interface Palette {
  plate: string; hi: string; edge: string; mid: string; lo: string; ok: string; err: string;
}

const LIGHT: Palette = {
  plate: "#ffffff", hi: "#1c2130", edge: "#8a92a0", mid: "#c3c8d0", lo: "#e4e7ec", ok: "#12845a", err: "#d23c32",
};
const DARK: Palette = {
  plate: "#0d0f13", hi: "#eef1f5", edge: "#80889a", mid: "#3c4350", lo: "#252a33", ok: "#3cc58b", err: "#f06b5f",
};

/** Each internal colour falls back to a public custom property, so users can theme from any ancestor. */
const vars = (p: Palette): string =>
  `--_p:var(--momenta-plate,${p.plate});--_h:var(--momenta-hi,${p.hi});--_e:var(--momenta-edge,${p.edge});` +
  `--_m:var(--momenta-mid,${p.mid});--_l:var(--momenta-lo,${p.lo});--_ok:var(--momenta-ok,${p.ok});` +
  `--_er:var(--momenta-err,${p.err});`;

const S = ".momenta svg";

export const styles =
  `.momenta{${vars(LIGHT)}--_sw:var(--momenta-stroke,1);display:block}` +
  `@media (prefers-color-scheme:dark){.momenta[data-theme=auto]{${vars(DARK)}}}` +
  `:is(.dark,[data-theme=dark]) .momenta[data-theme=auto],.momenta[data-theme=dark]{${vars(DARK)}}` +
  `:is(.light,[data-theme=light]) .momenta[data-theme=auto]{${vars(LIGHT)}}` +
  `${S}{display:block;width:100%;height:auto;overflow:visible;touch-action:pan-y}` +
  `${S} *{fill:none;vector-effect:non-scaling-stroke;stroke-width:var(--_sw);stroke-linejoin:round;stroke-linecap:round}` +
  `${S} .w{stroke-width:calc(var(--_sw)*2)}${S} .d{stroke-dasharray:3 3}` +
  `${S} .f{fill:var(--_p)}${S} .e{stroke:var(--_e)}${S} .m{stroke:var(--_m)}${S} .l{stroke:var(--_l)}` +
  `${S} .h{stroke:var(--_h)}${S} .k{stroke:var(--_ok)}${S} .x{stroke:var(--_er)}` +
  `${S} .fe{fill:var(--_e)}${S} .fh{fill:var(--_h)}${S} .fk{fill:var(--_ok)}${S} .fx{fill:var(--_er)}` +
  `${S} .fm{fill:var(--_m)}${S} .fl{fill:var(--_l)}`;

const STYLE_ID = "momenta-styles";

export function injectStyles(): void {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = styles;
  document.head.appendChild(style);
}
