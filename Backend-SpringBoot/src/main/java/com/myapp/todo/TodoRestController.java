package com.myapp.todo;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "http://localhost:3001")
@RestController
@RequestMapping(path = "/todo")
public class TodoRestController {

    @Autowired
    private TodoItemRepository repository;

    @Autowired
    private TodoService todoService;

    @GetMapping("/allbydate")
    public @ResponseBody GroupedTodoItems getAllByDate() {
        return todoService.getGroupedByDate();
    }
    @GetMapping("/all")
    public @ResponseBody Iterable<TodoItem> getAll() {
        Iterable<TodoItem> todoList = repository.findAll();
        return repository.findAll();
    }

    @PostMapping("/add")
    public @ResponseBody Result addItem(
            @RequestParam String category,
            @RequestParam String name,
            @RequestParam LocalDate taskDate,
            @RequestParam(required = false) TodoItem.RepeatPattern repeatType,
            @RequestParam(required = false) Integer repeatDuration,
            @RequestParam(required = false) Integer priority) {

        List<TodoItem> existingTasks = repository.findByTaskDate(taskDate);
        int nextOrder = existingTasks.size() + 1;

        TodoItem item = new TodoItem(taskDate, nextOrder, category, name);
        item.setRepeatType(repeatType != null ? repeatType : TodoItem.RepeatPattern.NONE);
        item.setRepeatDuration(repeatDuration != null ? repeatDuration : 0);
        item.setPriority(priority != null ? priority : 0);

        TodoItem saved = repository.save(item);
        return new Result("Added", saved);
    }

    @PostMapping("/update")
    public @ResponseBody Result updateItem(@RequestParam long id, @RequestParam String field, @RequestParam String value) {
        Optional<TodoItem> optItem = repository.findById(id);
        if (optItem.isEmpty()) {
            return new Result("Error: Item not found", null);
        } else {
            TodoItem item = optItem.get();
            switch (field) {
                case "taskName":
                    item.setName(value);
                    break;
                case "category":
                    item.setCategory(value);
                    break;
                case "taskDate":
                    item.setTaskDate(LocalDate.parse(value));
                    break;
                case "dayOrder":
                    item.setDayOrder(Integer.parseInt(value));
                    break;
                case "complete":
                    item.setComplete(Boolean.parseBoolean(value));
                    break;
                case "priority":
                    item.setPriority(Integer.parseInt(value));
                    break;
                case "repeatType":
                    item.setRepeatType(TodoItem.RepeatPattern.valueOf(value));
                    break;
                case "repeatDuration":
                    item.setRepeatDuration(Integer.parseInt(value));
                    break;
                default:
                    return new Result("Error: Invalid field", null);
            }

            TodoItem savedItem = repository.save(item);
            return new Result("Updated", savedItem);
        }
    }

    @DeleteMapping("/delete/{id}")
    public boolean delete(@PathVariable Long id) {
        Optional<TodoItem> optItem = repository.findById(id);
        if (optItem.isPresent()) {
            TodoItem item = optItem.get();
        repository.deleteById(id);
        return item.isComplete(); // Successful deletion
        }
        else {
        System.err.println("Error deleting item: " + id);
        }
        return false;
    }

    public static class  Result {
        private String status;
        private TodoItem item;

        public Result() {
            status = "";
            item = null;
        }
        public Result(String status, TodoItem item) {
            this.status = status;
            this.item = item;
        }

        public TodoItem getItem() {
            return item;
        }

        public void setItem(TodoItem item) {
            this.item = item;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }
    }
}
