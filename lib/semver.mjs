// SemVer belongs to releases. Tasks and iterations get IDs, never versions.
const RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?$/;

const RESERVED_BUMPS = new Set(['major', 'minor', 'patch', 'release']);

export function parse(version) {
  if (typeof version !== 'string') return null;
  const m = RE.exec(version);
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4] ?? null,
  };
}

export function isValid(version) {
  return parse(version) !== null;
}

function comparePrerelease(a, b) {
  // Absent pre-release outranks any pre-release: 0.4.0 > 0.4.0-rc.1
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  const as = a.split('.');
  const bs = b.split('.');
  for (let i = 0; i < Math.max(as.length, bs.length); i += 1) {
    const x = as[i];
    const y = bs[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xNum = /^\d+$/.test(x);
    const yNum = /^\d+$/.test(y);
    if (xNum && yNum) {
      if (Number(x) !== Number(y)) return Number(x) < Number(y) ? -1 : 1;
    } else if (xNum !== yNum) {
      return xNum ? -1 : 1; // numeric identifiers rank below alphanumeric
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

export function compare(a, b) {
  const va = parse(a);
  const vb = parse(b);
  if (!va) throw new Error(`Not a valid SemVer version: ${a}`);
  if (!vb) throw new Error(`Not a valid SemVer version: ${b}`);
  for (const key of ['major', 'minor', 'patch']) {
    if (va[key] !== vb[key]) return va[key] < vb[key] ? -1 : 1;
  }
  return comparePrerelease(va.prerelease, vb.prerelease);
}

export function next(version, bump) {
  const v = parse(version);
  if (!v) throw new Error(`Not a valid SemVer version: ${version}`);

  if (bump === 'major') return `${v.major + 1}.0.0`;
  if (bump === 'minor') return `${v.major}.${v.minor + 1}.0`;

  if (bump === 'patch') {
    if (v.prerelease) {
      throw new Error(
        `${version} is a pre-release; use "release" to promote it before bumping patch`,
      );
    }
    return `${v.major}.${v.minor}.${v.patch + 1}`;
  }

  if (bump === 'release') {
    if (!v.prerelease) throw new Error(`${version} is already a final release`);
    return `${v.major}.${v.minor}.${v.patch}`;
  }

  // Anything else is a pre-release identifier: dev, alpha, beta, rc, ...
  if (RESERVED_BUMPS.has(bump)) throw new Error(`Unhandled bump: ${bump}`);
  const base = `${v.major}.${v.minor}.${v.patch}`;
  if (v.prerelease) {
    const [id, count] = v.prerelease.split('.');
    if (id === bump) return `${base}-${bump}.${Number(count ?? 0) + 1}`;
  }
  return `${base}-${bump}.1`;
}
