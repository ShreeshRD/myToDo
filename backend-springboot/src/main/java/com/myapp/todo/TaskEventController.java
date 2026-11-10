package com.myapp.todo;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(path = "/todo/events")
public class TaskEventController {

    private final TaskEventService taskEventService;

    public TaskEventController(TaskEventService taskEventService) {
        this.taskEventService = taskEventService;
    }

    @GetMapping("/{taskId}")
    public @ResponseBody List<TaskEvent> getEvents(@PathVariable Long taskId) {
        return taskEventService.listForTask(taskId);
    }
}
