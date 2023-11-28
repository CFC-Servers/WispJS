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

/**
 * Handles interactions with Server Schedules
 *
 * @public
 */
export class SchedulesAPI {
  constructor(private core: WispAPICore) {}


  /**
   * Retrieves all of the Schedules for the Server
   *
   * @public
   */
  async List(): Promise<GetSchedulesResponse> {
    const response = await this.core.makeRequest("GET", "schedules", { include: "tasks" });
    const data: GetSchedulesResponse = await response.json();

    return data
  }


  /**
   * Retrieves the Details for the Schedule
   *
   * @param id The ID of the Schedule
   *
   * @public
   */
  async GetDetails(id: string): Promise<Schedule> {
    const response = await this.core.makeRequest("GET", `schedules/${id}`, { include: "tasks" });
    const data: Schedule = await response.json();

    return data;
  }


  /**
   * Creates a new Schedule
   *
   * @example
   * Creates a Schedule that runs at 12am every day
   * ```
   * await wisp.api.Schedules.Create("Example", "0", "0", "*", "*", true);
   * ```
   *
   * @param name The name of the Schedule
   * @param minute The Cron minute string
   * @param hour The Cron hour string
   * @param dow The Cron day of week string
   * @param dom The Cron day of month string
   * @param active Whether to enable the Schedle on creation
   *
   * @public
   */
  async Create(name: string, minute: string, hour: string, dow: string, dom: string, active: boolean): Promise<Schedule> {
    const requestData: CreateScheduleRequest = {
      name: name,
      cron_minute: minute,
      cron_hour: hour,
      cron_day_of_week: dow,
      cron_day_of_month: dom,
      is_active: active
    }

    const response = await this.core.makeRequest("POST", "schedules", requestData);
    const data: Schedule = await response.json();

    return data;
  }


  /**
   * Updates the values of the Schedule
   *
   * @param id The ID of the Schedule
   * @param name The name of the Schedule
   * @param minute The Cron minute string
   * @param hour The Cron hour string
   * @param dow The Cron day of week string
   * @param dom The Cron day of month string
   * @param active Whether to enable the Schedle on creation
   *
   * @public
   */
  async Update(id: string, name: string, minute: string, hour: string, dow: string, dom: string, active: boolean): Promise<Schedule> {
    const requestData: CreateScheduleRequest = {
      name: name,
      cron_minute: minute,
      cron_hour: hour,
      cron_day_of_week: dow,
      cron_day_of_month: dom,
      is_active: active
    }

    const response = await this.core.makeRequest("PATCH", `schedules/${id}`, requestData);
    const data: Schedule = await response.json();

    return data;
  }


  /**
   * Triggers the Schedule
   *
   * @param id The ID of the Schedule
   *
   * @public
   */
  async Trigger(id: string): Promise<void> {
    await this.core.makeRequest("POST", `schedules/${id}`);
  }


  /**
   * Deletes the Schedule
   *
   * @param id The ID of the Schedule
   *
   * @public
   */
  async Delete(id: string): Promise<void> {
    await this.core.makeRequest("DELETE", `schedules/${id}`);
  }


  /**
   * Creates a new Task for a Schedule
   *
   * @remarks
   * ℹ️  Payload is not required for backup action!
   *
   * @param id The ID of the Schedule to create a Task for
   * @param action The Task action. One of: ["command", "power", "backup"]
   * @param timeOffset The time offset of the Task
   * @param payload The payload to provide to the Task
   *
   * @public
   */
  async CreateTask(id: string, action: ScheduleTaskAction, timeOffset: number, payload: string | null): Promise<ScheduleTask> {
    const requestData: CreateScheduleTaskRequest = {
      action: action,
      time_offset: timeOffset,
      payload: payload
    }

    const response = await this.core.makeRequest("POST", `schedules/${id}/tasks`, requestData);
    const data: ScheduleTask = await response.json();

    return data;
  }


  /**
   * Update the Task
   *
   * @remarks
   * ℹ️  Payload is not required for backup action!
   *
   * @param scheduleID The ID of the Schedule that contains the Task
   * @param taskID The ID of the Task
   * @param action The Task action. One of: ["command", "power", "backup"]
   * @param timeOffset The time offset of the Task
   * @param payload The payload to provide to the Task
   *
   * @public
   */
  async UpdateTask(scheduleID: string, taskID: string, action: ScheduleTaskAction, timeOffset: number, payload: string | null): Promise<ScheduleTask> {
    const requestData: CreateScheduleTaskRequest = {
      action: action,
      time_offset: timeOffset,
      payload: payload
    }

    const response = await this.core.makeRequest("PATCH", `schedules/${scheduleID}/tasks/${taskID}`, requestData);
    const data: ScheduleTask = await response.json();

    return data;
  }


  /**
   * Delete the Task
   *
   * @param scheduleID The ID of the Schedule that contains the Task
   * @param taskID The ID of the Task
   *
   * @public
   */
  async DeleteTask(scheduleID: string, taskID: string): Promise<void> {
    await this.core.makeRequest("DELETE", `schedules/${scheduleID}/tasks/${taskID}`);
  }
}
