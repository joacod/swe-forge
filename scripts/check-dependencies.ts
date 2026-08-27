type PackageJson = Record<string, unknown>;

// Changing this list is an intentional dependency-policy change.
const restrictedFields = [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
  "trustedDependencies",
] as const;

const packageJson = JSON.parse(
  await Bun.file(new URL("../package.json", import.meta.url)).text(),
) as PackageJson;

const presentRestrictedFields = restrictedFields.filter((field) =>
  Object.prototype.hasOwnProperty.call(packageJson, field),
);

if (presentRestrictedFields.length > 0) {
  console.error(
    `Dependency policy violation: package.json defines ${presentRestrictedFields.join(", ")}. ` +
      "An approved exception must update this guard in the same reviewed change.",
  );
  process.exit(1);
}

console.log("PASS: package dependency policy");
