import type { ScaleFitResult } from './types';

export interface SolverRow {
  w: number;   // joint weight
  px: number;  // rig joint 2D projected x
  py: number;  // rig joint 2D projected y
  qx: number;  // user landmark 2D x
  qy: number;  // user landmark 2D y
}

/**
 * Solves closed-form weighted least-squares uniform scale (s) and 2D translation (t)
 * matching 3D rig joint projections to 2D user landmarks.
 */
export function solveLeastSquares(rows: SolverRow[]): ScaleFitResult | null {
  if (rows.length < 3) return null;

  // Initial Pass
  let sw = 0;
  let pbx = 0, pby = 0;
  let qbx = 0, qby = 0;

  for (const r of rows) {
    sw += r.w;
    pbx += r.w * r.px;
    pby += r.w * r.py;
    qbx += r.w * r.qx;
    qby += r.w * r.qy;
  }

  if (sw <= 0.0001) return null;

  pbx /= sw;
  pby /= sw;
  qbx /= sw;
  qby /= sw;

  let num = 0;
  let den = 0;

  for (const r of rows) {
    const dx = r.px - pbx;
    const dy = r.py - pby;
    num += r.w * (dx * (r.qx - qbx) + dy * (r.qy - qby));
    den += r.w * (dx * dx + dy * dy);
  }

  if (den <= 0.000001) return null;

  let s = num / den;
  if (isNaN(s) || s <= 0.01) s = 1.0;

  // Calculate residuals for robust outlier pass
  const residuals = rows.map((r) => {
    const projX = pbx + s * (r.px - pbx);
    const projY = pby + s * (r.py - pby);
    const errX = r.qx - (qbx + projX - pbx);
    const errY = r.qy - (qby + projY - pby);
    return Math.sqrt(errX * errX + errY * errY);
  });

  const sortedRes = [...residuals].sort((a, b) => a - b);
  const medianRes = sortedRes[Math.floor(sortedRes.length / 2)] || 0.05;
  const threshold = Math.max(0.08, medianRes * 2.5);

  // Robust Pass: filter out outliers beyond threshold
  const filteredRows = rows.filter((_, idx) => residuals[idx] <= threshold);

  if (filteredRows.length >= 3 && filteredRows.length < rows.length) {
    // Re-solve on clean inlier set
    let sw2 = 0, pbx2 = 0, pby2 = 0, qbx2 = 0, qby2 = 0;
    for (const r of filteredRows) {
      sw2 += r.w;
      pbx2 += r.w * r.px;
      pby2 += r.w * r.py;
      qbx2 += r.w * r.qx;
      qby2 += r.w * r.qy;
    }
    pbx2 /= sw2; pby2 /= sw2; qbx2 /= sw2; qby2 /= sw2;

    let num2 = 0, den2 = 0;
    for (const r of filteredRows) {
      const dx = r.px - pbx2;
      const dy = r.py - pby2;
      num2 += r.w * (dx * (r.qx - qbx2) + dy * (r.qy - qby2));
      den2 += r.w * (dx * dx + dy * dy);
    }
    if (den2 > 0.000001) {
      s = num2 / den2;
      pbx = pbx2; pby = pby2; qbx = qbx2; qby = qby2;
    }
  }

  // Translation offsets t
  const tx = qbx - s * pbx;
  const ty = qby - s * pby;

  return { s, tx, ty };
}

/** Rate limits scale changes to max percent per frame to prevent popping */
export class ScaleSmoother {
  private currentScale = 1.0;
  private currentTx = 0;
  private currentTy = 0;
  private isInitialized = false;

  public update(target: ScaleFitResult, isLocked: boolean, maxRate = 0.03): ScaleFitResult {
    if (!this.isInitialized) {
      this.currentScale = target.s;
      this.currentTx = target.tx;
      this.currentTy = target.ty;
      this.isInitialized = true;
      return target;
    }

    if (!isLocked) {
      // Clamped scale rate change (max 3% per frame)
      const diff = target.s - this.currentScale;
      const maxDelta = this.currentScale * maxRate;
      const clampedDelta = Math.max(-maxDelta, Math.min(maxDelta, diff));
      this.currentScale += clampedDelta;
    }

    // Translation snaps smoothly for responsive tracking
    this.currentTx += (target.tx - this.currentTx) * 0.4;
    this.currentTy += (target.ty - this.currentTy) * 0.4;

    return {
      s: this.currentScale,
      tx: this.currentTx,
      ty: this.currentTy,
    };
  }

  public reset() {
    this.isInitialized = false;
  }
}
