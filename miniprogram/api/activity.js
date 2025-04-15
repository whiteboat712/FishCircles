import http from "../utils/http";

// 获取所有活动
export const reqAllActivities = () => {
  return http.get("/activity/all");
};

// 获取活动详情
export const reqActivityDetail = (activityId) => {
  return http.get(`/activity/${activityId}`);
};

// 添加活动
export const reqAddActivity = (
  title,
  organizerId,
  spotId,
  description,
  images,
  startTime
) => {
  return http.post(
    `/activity/add?title=${title}&organizerId=${organizerId}&spotId=${spotId}&description=${description}&images=%5B${images}%5D&startTime=${startTime}`
  );
};

// 删除活动
export const reqDeleteActivity = (activityId) => {
  return http.post("/activity/delete", { activityId });
};

// 搜索活动
export const reqSearchActivity = (query) => {
  return http.get(`/activity/search?query=${query}`);
};

// 参加活动
export const reqJoinActivity = (activityId, userId) => {
  return http.post(
    `/activityParticipation/add?activityId=${activityId}&userId=${userId}`
  );
};

// 获取活动参与者
export const reqActivityParticipants = (activityId) => {
  return http.get(`/activityParticipation/activity?activityId=${activityId}`);
};

export const reqUserActivity = (userId) => {
  return http.get(`/activityParticipation/user?userId=${userId}`);
};
