// The unit under test. The "fixable red" trial breaks THIS file (the code at fault);
// the test below is the oracle the auto-fix loop must satisfy.
export function sum(a, b) {
  return a + b;
}
