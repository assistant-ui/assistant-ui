/** Styles that depend on the document direction through selectors, not only the `direction` property. */
const css = `
.dir-a { height: 10px; width: 40px; background: #64748b; }
.dir-a:dir(rtl) { width: 80px; }
.dir-b { height: 10px; width: 30px; background: #0ea5e9; }
[dir="rtl"] .dir-b { width: 90px; }
`;

export default function Dir() {
  return (
    <div>
      <style>{css}</style>
      <div data-probe="a" className="dir-a" />
      <div data-probe="b" className="dir-b" />
    </div>
  );
}
