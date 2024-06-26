package com.myapp.todo;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = {
        "http://192.168.1.1:3000",
        "http://192.168.1.2:3000",
        "http://192.168.1.3:3000",
        "http://192.168.1.4:3000",
        "http://192.168.1.5:3000",
        "http://192.168.1.6:3000",
        "http://192.168.1.7:3000",
        "http://192.168.1.8:3000",
        "http://192.168.1.9:3000",
        "http://192.168.1.10:3000",
        "http://localhost:3000"
}, maxAge = 3600)
//@CrossOrigin(origins = "*")
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
    public @ResponseBody Result addItem(@RequestParam String category, @RequestParam String name, @RequestParam LocalDate taskDate) {
        List<TodoItem> existingTasks = repository.findByTaskDate(taskDate);
        int nextOrder = existingTasks.size() + 1;
        TodoItem item = new TodoItem(taskDate, nextOrder, category, name);
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
                default:
                    return new Result("Error: Invalid field", null);
            }

            TodoItem savedItem = repository.save(item);
            return new Result("Updated", savedItem);
        }
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        try {
            repository.deleteById(id);
            return ResponseEntity.noContent().build(); // Successful deletion
        } catch (Exception e) {
            System.err.println("Error deleting item: " + e.getMessage());
            // Consider returning a more specific status code for the error
            return ResponseEntity.badRequest().build();
        }
    }

    class Result {
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
