// app.js
import { toast } from "./utils/extendApi";
import {
  asyncSetStorage,
  asyncGetStorage,
  asyncRemoveStorage,
  asyncClearStorage,
} from "./utils/storage";

App({
  globalData: {
    user: null,
    baseUrl: "http://8.130.41.53:8080/api",
  },
  async onShow() {},
});
