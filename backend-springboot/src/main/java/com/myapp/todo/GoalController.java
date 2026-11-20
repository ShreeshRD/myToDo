package com.myapp.todo;

import com.myapp.todo.dto.GoalView;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(path = "/todo/goals")
public class GoalController {

    private final GoalService goalService;

    public GoalController(GoalService goalService) {
        this.goalService = goalService;
    }

    @GetMapping
    public @ResponseBody List<GoalView> list() {
        return goalService.list();
    }

    @GetMapping("/{id}")
    public @ResponseBody GoalView get(@PathVariable Long id) {
        return goalService.get(id);
    }

    @PostMapping
    public @ResponseBody GoalView create(@RequestBody Map<String, String> body) {
        Goal.Kind kind = null;
        Goal.Mode mode = null;
        if (body != null) {
            if (body.get("kind") != null && !body.get("kind").isBlank()) {
                kind = Goal.Kind.valueOf(body.get("kind").trim().toUpperCase());
            }
            if (body.get("mode") != null && !body.get("mode").isBlank()) {
                mode = Goal.Mode.valueOf(body.get("mode").trim().toUpperCase());
            }
        }
        return goalService.create(body == null ? null : body.get("title"), kind, mode);
    }

    @PatchMapping("/{id}")
    public @ResponseBody GoalView update(@PathVariable Long id, @RequestBody Map<String, String> fields) {
        return goalService.update(id, fields);
    }

    @PostMapping("/{id}/complete")
    public @ResponseBody GoalView complete(@PathVariable Long id) {
        return goalService.complete(id);
    }

    @PostMapping("/{id}/reopen")
    public @ResponseBody GoalView reopen(@PathVariable Long id) {
        return goalService.reopen(id);
    }

    @GetMapping("/{id}/tasks")
    public @ResponseBody List<TodoItem> linkedTasks(@PathVariable Long id) {
        return goalService.linkedTasks(id);
    }

    @PostMapping("/{id}/roadmap/steps")
    public @ResponseBody TodoItem addRoadmapStep(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String name = body == null ? null : body.get("name");
        String rawDate = body == null ? null : body.get("date");
        LocalDate date = (rawDate == null || rawDate.isBlank() || "null".equals(rawDate))
                ? null
                : LocalDate.parse(rawDate.trim());
        return goalService.addRoadmapStep(id, name, date);
    }

    @PostMapping("/{id}/roadmap/reorder")
    public @ResponseBody void reorderRoadmap(@PathVariable Long id, @RequestBody List<Long> orderedIds) {
        goalService.reorderRoadmap(id, orderedIds);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        goalService.delete(id);
    }
}
