package com.myapp.todo;

import org.springframework.data.repository.CrudRepository;

import java.util.List;

public interface SkillOccurrenceRepository extends CrudRepository<SkillOccurrence, Long> {
    List<SkillOccurrence> findByGoalIdOrderByDateDescIdDesc(Long goalId);

    long countByGoalId(Long goalId);

    void deleteByGoalId(Long goalId);
}
