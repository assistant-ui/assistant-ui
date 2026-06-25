export function optionValues(args, name) {
  const values = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--") continue;
    if (arg === name) {
      const value = args[i + 1];
      if (value === undefined) {
        throw new Error(`Missing value for ${name}.`);
      }
      values.push(value);
      i++;
    } else if (arg.startsWith(`${name}=`)) {
      values.push(arg.slice(name.length + 1));
    }
  }
  return values;
}

export function hasOption(args, name) {
  return args.includes(name);
}
