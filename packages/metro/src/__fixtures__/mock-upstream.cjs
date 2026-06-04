// A stand-in for the project's upstream Metro babel transformer. It echoes the
// `src` it was handed so tests can assert what the wrapper produced.
module.exports = {
  transform(props) {
    return { ast: null, src: props.src };
  },
  getCacheKey() {
    return "mock-upstream-key";
  },
};
