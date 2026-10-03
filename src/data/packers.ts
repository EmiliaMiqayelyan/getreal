/**
 * Users eligible for the packing role.
 * Packer Manager is the only screen that assigns them.
 * `outsideOrderCount` stands in for assignments that are not in the local
 * order catalog, so the dropdown can show workload. Replace it with the
 * API assigned-order count when that list is live.
 */
export type EligiblePacker = {
  id: string;
  name: string;
  /** Public packer code, e.g. PCK-U003-01. */
  code: string;
  role: "packer";
  outsideOrderCount: number;
};

export const ELIGIBLE_PACKERS: EligiblePacker[] = [
  {
    id: "packer-vahan",
    name: "Vahan N",
    code: "PCK-U003-01",
    role: "packer",
    outsideOrderCount: 7,
  },
  {
    id: "packer-rachel",
    name: "Rachel N",
    code: "PCK-U003-02",
    role: "packer",
    outsideOrderCount: 0,
  },
  {
    id: "packer-gevorg",
    name: "Gevorg S",
    code: "PCK-U003-03",
    role: "packer",
    outsideOrderCount: 0,
  },
];

export const PACKER_VAHAN = ELIGIBLE_PACKERS[0]!;
export const PACKER_GEVORG = ELIGIBLE_PACKERS[2]!;
