import {
  createElement, forwardRef, useEffect, useImperativeHandle, useRef,
  type ForwardRefExoticComponent, type HTMLAttributes, type RefAttributes,
} from "react";
import type { Figure, FigureInstance, FigureOptions } from "../core/types";

export interface FigureProps extends FigureOptions, Omit<HTMLAttributes<HTMLDivElement>, "children" | "color"> {}

export type FigureComponent = ForwardRefExoticComponent<FigureProps & RefAttributes<HTMLDivElement>>;

/** Wraps a figure as a React component that renders a `<div>` and forwards its ref. */
export function createComponent(figure: Figure<any>): FigureComponent {
  const Component = forwardRef<HTMLDivElement, FigureProps>(function MomentaFigure(props, ref) {
    const {
      state, intensity, theme, label, play, speed, progress, count, interactive, marks, colors, stroke,
      "aria-label": ariaLabel, ...rest
    } = props;
    const element = useRef<HTMLDivElement>(null);
    const instance = useRef<FigureInstance | null>(null);
    const options: FigureOptions = {
      state, intensity, theme, label: label ?? ariaLabel, play, speed, progress, count, interactive, marks, colors, stroke,
    };
    const colorKey = colors ? JSON.stringify(colors) : "";

    useImperativeHandle(ref, () => element.current as HTMLDivElement);

    useEffect(() => {
      instance.current = figure(element.current!, options);
      return () => {
        instance.current?.destroy();
        instance.current = null;
      };
      // Mount once; option changes go through `update` below.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      instance.current?.update(options);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, intensity, theme, label, ariaLabel, play, speed, progress, count, interactive, marks, colorKey, stroke]);

    return createElement("div", { ...rest, ref: element });
  });
  Component.displayName = figure.definition.name;
  return Component;
}
