package com.myapp.todo;

import com.myapp.todo.dto.TodoOperationResult;
import java.time.LocalDate;
import java.time.LocalTime;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(path = "/todo")
public class TodoRestController {

    @Autowired
    private TodoService todoService;

    @GetMapping("/allbydate")
    public @ResponseBody GroupedTodoItems getAllByDate() {
        return todoService.getGroupedByDate();
    }

    @GetMapping("/all")
    public @ResponseBody Iterable<TodoItem> getAll() {
        return todoService.getAll();
    }

    @PostMapping("/add")
    public @ResponseBody TodoOperationResult addItem(
            @RequestParam String category,
            @RequestParam String name,
            @RequestParam LocalDate taskDate,
            @RequestParam(required = false) TodoItem.RepeatPattern repeatType,
            @RequestParam(required = false) Integer repeatDuration,
            @RequestParam(required = false) Integer priority,
            @RequestParam(required = false) Boolean longTerm,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime assignedTime,
            @RequestParam(required = false) Integer reminderMinutesBefore) {

        return todoService.addTask(category, name, taskDate, repeatType, repeatDuration, priority, longTerm,
                assignedTime, reminderMinutesBefore);
    }

    @PostMapping("/update")
    public @ResponseBody TodoOperationResult updateItem(
            @RequestParam long id,
            @RequestParam String field,
            @RequestParam String value) {
        return todoService.updateTaskField(id, field, value);
    }

    @PostMapping("/edit")
    public @ResponseBody TodoOperationResult editItem(
            @RequestParam long id,
            @RequestParam String category,
            @RequestParam String name,
            @RequestParam LocalDate taskDate,
            @RequestParam(required = false) TodoItem.RepeatPattern repeatType,
            @RequestParam(required = false) Integer repeatDuration,
            @RequestParam(required = false) Integer priority,
            @RequestParam(required = false) Boolean longTerm,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime assignedTime,
            @RequestParam(required = false) Integer reminderMinutesBefore) {

        return todoService.editTask(id, category, name, taskDate, repeatType, repeatDuration, priority, longTerm,
                assignedTime, reminderMinutesBefore);
    }

    @DeleteMapping("/delete/{id}")
    public boolean delete(@PathVariable Long id) {
        return todoService.deleteTask(id);
    }
}
