export const STICK_JOINTS = [
  "root", "spine", "chest", "neck", "head",
  "left_shoulder", "left_elbow", "left_hand",
  "right_shoulder", "right_elbow", "right_hand",
  "left_hip", "left_knee", "left_foot",
  "right_hip", "right_knee", "right_foot"
];

export const STICK_LINES = [
  ["root", "spine"], ["spine", "chest"], ["chest", "neck"], ["neck", "head"],
  ["chest", "left_shoulder"], ["left_shoulder", "left_elbow"], ["left_elbow", "left_hand"],
  ["chest", "right_shoulder"], ["right_shoulder", "right_elbow"], ["right_elbow", "right_hand"],
  ["root", "left_hip"], ["left_hip", "left_knee"], ["left_knee", "left_foot"],
  ["root", "right_hip"], ["right_hip", "right_knee"], ["right_knee", "right_foot"]
];
