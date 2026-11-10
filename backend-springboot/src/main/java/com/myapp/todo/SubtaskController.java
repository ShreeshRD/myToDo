package com.myapp.todo;

import com.myapp.todo.dto.SubtaskCount;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(path = "/todo/subtasks")
public class SubtaskController {

    private final SubtaskService subtaskService;

    public SubtaskController(SubtaskService subtaskService) {
        this.subtaskService = subtaskService;
    }

    @GetMapping("/{taskId}")
    public @ResponseBody List<Subtask> list(@PathVariable Long taskId) {
        return subtaskService.listForTask(taskId);
    }

    @GetMapping("/counts/all")
    public @ResponseBody List<SubtaskCount> counts() {
        return subtaskService.counts();
    }

    @PostMapping("/{taskId}")
    public @ResponseBody Subtask create(@PathVariable Long taskId, @RequestBody Map<String, String> body) {
        return subtaskService.create(taskId, body == null ? null : body.get("title"));
    }

    @PatchMapping("/item/{id}")
    public @ResponseBody Subtask update(@PathVariable Long id, @RequestBody Map<String, String> fields) {
        return subtaskService.update(id, fields);
    }

    @PostMapping("/{taskId}/reorder")
    public @ResponseBody List<Subtask> reorder(@PathVariable Long taskId, @RequestBody List<Long> ids) {
        return subtaskService.reorder(taskId, ids);
    }

    @DeleteMapping("/item/{id}")
    public void delete(@PathVariable Long id) {
        subtaskService.delete(id);
    }
}
