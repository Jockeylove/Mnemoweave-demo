// Walkable exhibition floor and conservative furniture footprints in world X/Z.
// Visibility graph + Dijkstra gives a collision-free shortest polyline.
export const hallBounds = { minX: -4.85, maxX: 4.95, minZ: -4.15, maxZ: 5.3 };
export const hallObstacles = [
  { minX: -2.35, maxX: 2.35, minZ: -2.5, maxZ: 1.23 },
  { minX: -4.95, maxX: -3.4, minZ: -2.45, maxZ: 1.05 },
  { minX: 2.1, maxX: 4.75, minZ: -3.45, maxZ: -1.7 },
  { minX: -5, maxX: -1.55, minZ: 3.03, maxZ: 3.85 },
  { minX: 1.55, maxX: 5, minZ: 3.03, maxZ: 3.85 },
  { minX: -4.85, maxX: -2.2, minZ: 4.05, maxZ: 5.3 },
  { minX: 4.05, maxX: 4.95, minZ: 4.35, maxZ: 5.3 }
];
export const hallSpots = { inspect: [0, 1.75], footage: [3.2, -.95], entrance: [-.65, 4.65] };
const inside = ([x,z], r) => x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ;
export function walkable(point, obstacles = hallObstacles) {
  return Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) &&
    point[0] >= hallBounds.minX && point[0] <= hallBounds.maxX &&
    point[1] >= hallBounds.minZ && point[1] <= hallBounds.maxZ &&
    !obstacles.some(r => inside(point, r));
}
export function clearSegment(a, b, obstacles = hallObstacles) {
  return !obstacles.some(rect => {
    let enter = 0, leave = 1;
    for (const [axis, low, high] of [[0,rect.minX,rect.maxX],[1,rect.minZ,rect.maxZ]]) {
      const d = b[axis] - a[axis];
      if (Math.abs(d) < 1e-9) {
        if (a[axis] <= low || a[axis] >= high) return false;
      } else {
        const t1 = (low - a[axis]) / d, t2 = (high - a[axis]) / d;
        enter = Math.max(enter, Math.min(t1, t2));
        leave = Math.min(leave, Math.max(t1, t2));
        if (leave <= enter) return false;
      }
    }
    return leave > enter && leave > 0 && enter < 1;
  });
}
export function findPath(start, target, obstacles = hallObstacles) {
  if (!walkable(start, obstacles) || !walkable(target, obstacles)) return null;
  const points = [start, target];
  for (const r of obstacles) for (const x of [r.minX-.025,r.maxX+.025]) for (const z of [r.minZ-.025,r.maxZ+.025]) {
    if (walkable([x,z], obstacles)) points.push([x,z]);
  }
  const distances = points.map(()=>Infinity), previous = points.map(()=>-1), visited = new Set();
  distances[0] = 0;
  while (visited.size < points.length) {
    let current = -1;
    for (let i=0;i<points.length;i++) if (!visited.has(i) && (current < 0 || distances[i] < distances[current])) current = i;
    if (current < 0 || !Number.isFinite(distances[current])) return null;
    if (current === 1) {
      const path = []; for (let at=1;at>=0;at=previous[at]) path.unshift([...points[at]]);
      return path;
    }
    visited.add(current);
    for (let i=0;i<points.length;i++) {
      if (visited.has(i) || !clearSegment(points[current],points[i],obstacles)) continue;
      const length = Math.hypot(points[current][0]-points[i][0],points[current][1]-points[i][1]);
      if (distances[current]+length < distances[i]) { distances[i]=distances[current]+length; previous[i]=current; }
    }
  }
  return null;
}
