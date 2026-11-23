package com.myapp.todo;

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
@RequestMapping(path = "/todo/skills")
public class SkillOccurrenceController {

    private final SkillOccurrenceService skillOccurrenceService;

    public SkillOccurrenceController(SkillOccurrenceService skillOccurrenceService) {
        this.skillOccurrenceService = skillOccurrenceService;
    }

    @GetMapping("/{skillId}/occurrences")
    public @ResponseBody List<SkillOccurrence> list(@PathVariable Long skillId) {
        return skillOccurrenceService.list(skillId);
    }

    @PostMapping("/{skillId}/occurrences")
    public @ResponseBody SkillOccurrence create(@PathVariable Long skillId, @RequestBody Map<String, String> body) {
        return skillOccurrenceService.create(
                skillId,
                body == null ? null : body.get("date"),
                body == null ? null : body.get("durationMinutes"),
                body == null ? null : body.get("rating"));
    }

    @PatchMapping("/occurrences/{id}")
    public @ResponseBody SkillOccurrence update(@PathVariable Long id, @RequestBody Map<String, String> fields) {
        return skillOccurrenceService.update(id, fields);
    }

    @DeleteMapping("/occurrences/{id}")
    public void delete(@PathVariable Long id) {
        skillOccurrenceService.delete(id);
    }
}
