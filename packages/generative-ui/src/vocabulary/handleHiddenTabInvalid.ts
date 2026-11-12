type ConstraintControl = Element & {
  form: HTMLFormElement | null;
  validity: ValidityState;
  focus: () => void;
  reportValidity: () => boolean;
};

const pendingForms = new WeakSet<HTMLFormElement>();

const isConstraintControl = (element: Element): element is ConstraintControl =>
  "form" in element &&
  "validity" in element &&
  typeof (element as ConstraintControl).focus === "function" &&
  typeof (element as ConstraintControl).reportValidity === "function";

export function handleHiddenTabInvalid(
  event: Event,
  tabs: HTMLElement,
  selectPanel: (index: number) => void,
) {
  const target = event.target;
  if (!(target instanceof Element) || !isConstraintControl(target)) return;

  const panels = Array.from(
    tabs.querySelectorAll<HTMLElement>('[role="tabpanel"]'),
  ).filter((panel) => panel.parentElement === tabs);
  const panelIndex = panels.findIndex(
    (panel) => panel.hidden && panel.contains(target),
  );
  if (panelIndex === -1) return;

  const form = target.form;
  if (!form) return;

  event.preventDefault();

  const firstInvalid = Array.from(form.elements).find(
    (element) =>
      element instanceof Element &&
      isConstraintControl(element) &&
      !element.validity.valid,
  );
  if (firstInvalid !== target) return;

  selectPanel(panelIndex);
  if (pendingForms.has(form)) return;

  pendingForms.add(form);
  setTimeout(() => {
    pendingForms.delete(form);
    if (!target.isConnected || target.closest("[hidden]")) return;

    target.focus();
    target.reportValidity();
  }, 0);
}
