package com.myapp.todo;

import com.myapp.todo.dto.ProjectCount;
import com.myapp.todo.dto.TaskCounts;
import com.myapp.todo.dto.TaskQuery;
import com.myapp.todo.dto.TodoOperationResult;
import java.time.LocalDate;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(path = "/todo")
public class TodoRestController {

    @Autowired
    private TodoItemRepository repository; // Kept for the getAll() method as per the provided Code Edit

    @Autowired
    private TodoService todoService;

    @GetMapping("/allbydate")
    public @ResponseBody GroupedTodoItems getAllByDate() {
        return todoService.getGroupedByDate();
    }

    @GetMapping("/all")
    public @ResponseBody Iterable<TodoItem> getAll() {
        return repository.findAll();
    }

    @PostMapping("/add")
    public @ResponseBody TodoOperationResult addItem(
            @RequestParam String category,
            @RequestParam String name,
            @RequestParam LocalDate taskDate,
            @RequestParam(required = false) TodoItem.RepeatPattern repeatType,
            @RequestParam(required = false) Integer repeatDuration,
            @RequestParam(required = false) Integer priority,
            @RequestParam(required = false) Boolean longTerm) {

        return todoService.addTask(category, name, taskDate, repeatType, repeatDuration, priority, longTerm);
    }

    @PostMapping("/update")
    public @ResponseBody TodoOperationResult updateItem(
            @RequestParam long id,
            @RequestParam String field,
            @RequestParam String value) {
        return todoService.updateTaskField(id, field, value);
    }

    @DeleteMapping("/delete/{id}")
    public boolean delete(@PathVariable Long id) {
        return todoService.deleteTask(id);
    }

    @GetMapping("/query")
    public @ResponseBody List<TodoItem> query(@ModelAttribute TaskQuery query) {
        return todoService.queryTasks(query);
    }

    @GetMapping("/count")
    public @ResponseBody TaskCounts count(@ModelAttribute TaskQuery query) {
        return todoService.countTasks(query);
    }

    @GetMapping("/item/{id}")
    public ResponseEntity<TodoItem> getItem(@PathVariable Long id) {
        return todoService.getTask(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/projects")
    public @ResponseBody List<ProjectCount> projects() {
        return todoService.getProjectCounts();
    }
}
