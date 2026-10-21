import { mount } from "./mount";
import type { Figure, FigureDefinition } from "./types";

/** Turns a definition into a figure: a function that draws it into an element. */
export function defineFigure<Model>(definition: FigureDefinition<Model>): Figure<Model> {
  const figure = ((element, options) => mount(definition, element, options)) as Figure<Model>;
  Object.defineProperty(figure, "definition", { value: definition, enumerable: true });
  return figure;
}
