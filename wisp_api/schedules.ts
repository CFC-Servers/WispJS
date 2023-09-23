import { WispAPICore } from "./index";
import type { PaginationData } from "./index";

export type CronSchedule = {
  minute: string;
  hour: string;
  day_of_week: string;
  day_of_month: string;
}

export type Schedule = {
  object: "schedule";
  attributes: {
    id: number;
    name: string;
    cron: CronSchedule;
    is_active: boolean;
    is_processing: boolean;
    last_run_at: string | null;
    next_run_at: string | null;
    created_at: string;
    updated_at: string;
  }
}

export type GetSchedulesResponse = {
  object: "list";
  data: Schedule[];
  meta: {
    pagination: PaginationData;
  }
}

export type CreateScheduleRequest = {
  name: string;
  cron_minute: string;
  cron_hour: string;
  cron_day_of_week: string;
  cron_day_of_month: string;
  is_active: boolean;
}

export type ScheduleTask = {
  object: "schedule_task";
  attributes: {
    id: number;
    sequence_id: number;
    action: string;
    payload: string;
    time_offset: string;
    is_processing: boolean;
    created_at: string;
    updated_at: string;
  }
}

export type ScheduleTaskAction = "command" | "power" | "backup";

export type CreateScheduleTaskRequest = {
  action: ScheduleTaskAction;
  time_offset: number;
  payload: string | null;
}

export class SchedulesAPI {
  constructor(private core: WispAPICore) {}

  // [GET] /api/client/servers/<UUID>/schedules
  async List(): Promise<GetSchedulesResponse> {
    const response = await this.core.makeRequest("GET", "schedules", { include: "tasks" });
    const data: GetSchedulesResponse = await response.json();

    return data
  }

  // [GET] /api/client/servers/<UUID>/schedules/<ID>
  async GetDetails(id: string): Promise<Schedule> {
    const response = await this.core.makeRequest("GET", `schedules/${id}`, { include: "tasks" });
    const data: Schedule = await response.json();

    return data;
  }

  // [POST] /api/client/servers/<UUID>/schedules
  async Create(name: string, minute: string, hour: string, dow: string, dom: string, active: boolean): Promise<Schedule> {
    const data: CreateScheduleRequest = {
      name: name,
      cron_minute: minute,
      cron_hour: hour,
      cron_day_of_week: dow,
      cron_day_of_month: dom,
      is_active: active
    }

    const response = await this.core.makeRequest("POST", "schedules", data);
    const responseData: Schedule = await response.json();

    return responseData;
  }

  // [PATCH] /api/client/servers/<UUID>/schedules/<ID>
  async Update(id: string, name: string, minute: string, hour: string, dow: string, dom: string, active: boolean): Promise<Schedule> {
    const data: CreateScheduleRequest = {
      name: name,
      cron_minute: minute,
      cron_hour: hour,
      cron_day_of_week: dow,
      cron_day_of_month: dom,
      is_active: active
    }

    const response = await this.core.makeRequest("PATCH", `schedules/${id}`, data);
    const responseData: Schedule = await response.json();

    return responseData;
  }

  // [POST] /api/client/servers/<UUID>/schedules/<ID>/trigger
  async Trigger(id: string): Promise<Response> {
    return await this.core.makeRequest("POST", `schedules/${id}`);
  }

  // [DELETE] /api/client/servers/<UUID>/schedules/<ID>
  async Delete(id: string): Promise<Response> {
    return await this.core.makeRequest("DELETE", `schedules/${id}`);
  }

  // [POST] /api/client/servers/<UUID>/schedules/<SCHEDULE_ID>/tasks
  // "Payload is not required for backup action!"
  async CreateTask(id: string, action: ScheduleTaskAction, timeOffset: number, payload: string | null): Promise<ScheduleTask> {
    const data: CreateScheduleTaskRequest = {
      action: action,
      time_offset: timeOffset,
      payload: payload
    }

    const response = await this.core.makeRequest("POST", `schedules/${id}/tasks`, data);
    const responseData: ScheduleTask = await response.json();

    return responseData;
  }

  // [PATCH] /api/client/servers/<UUID>/schedules/<SCHEDULE_ID>/task/<TASK_ID>
  // "Payload is not required for backup action!"
  async UpdateTask(scheduleID: string, taskID: string, action: ScheduleTaskAction, timeOffset: number, payload: string | null): Promise<ScheduleTask> {
    const data: CreateScheduleTaskRequest = {
      action: action,
      time_offset: timeOffset,
      payload: payload
    }

    const response = await this.core.makeRequest("PATCH", `schedules/${scheduleID}/tasks/${taskID}`, data);
    const responseData: ScheduleTask = await response.json();

    return responseData;
  }

  // [DELETE] /api/client/servers/<UUID>/schedules/<SCHEDULE_ID>/task/<TASK_ID>
  async DeleteTask(scheduleID: string, taskID: string): Promise<Response> {
    return await this.core.makeRequest("DELETE", `schedules/${scheduleID}/tasks/${taskID}`);
  }
}
