package com.myapp.todo.ui

import com.myapp.todo.data.TaskEntity
import java.time.LocalDate

data class TodayState(
    val overdue: List<TaskEntity> = emptyList(),
    val today: List<TaskEntity> = emptyList(),
    val completed: List<TaskEntity> = emptyList(),
)

data class DayGroup(val date: LocalDate, val tasks: List<TaskEntity>)

enum class SearchFilter { ALL, ACTIVE, COMPLETED }

/** Pure list shaping for the screens; unit-tested. */
object TaskGrouping {
    /** Timed tasks first by time, then by the day's manual order, then name. */
    val dayComparator: Comparator<TaskEntity> = compareBy<TaskEntity, String?>(nullsLast()) { it.assignedTime }
        .thenBy(nullsLast()) { it.dayOrder }
        .thenBy { it.name.lowercase() }

    fun today(tasks: List<TaskEntity>, today: LocalDate): TodayState {
        val todayKey = today.toString()
        val overdue = tasks.filter { !it.complete && it.taskDate != null && it.taskDate < todayKey }
            .sortedWith(compareBy<TaskEntity> { it.taskDate }.then(dayComparator))
        val onToday = tasks.filter { it.taskDate == todayKey }
        return TodayState(
            overdue = overdue,
            today = onToday.filter { !it.complete }.sortedWith(dayComparator),
            completed = onToday.filter { it.complete }.sortedWith(dayComparator),
        )
    }

    fun upcoming(tasks: List<TaskEntity>, today: LocalDate, days: Long = 30): List<DayGroup> {
        val from = today.toString()
        val to = today.plusDays(days).toString()
        return tasks.asSequence()
            .filter { !it.complete && it.taskDate != null && it.taskDate >= from && it.taskDate <= to }
            .groupBy { it.taskDate!! }
            .toSortedMap()
            .map { (date, list) -> DayGroup(LocalDate.parse(date), list.sortedWith(dayComparator)) }
    }

    fun search(tasks: List<TaskEntity>, query: String, filter: SearchFilter): List<TaskEntity> {
        val q = query.trim()
        return tasks.asSequence()
            .filter {
                when (filter) {
                    SearchFilter.ALL -> true
                    SearchFilter.ACTIVE -> !it.complete
                    SearchFilter.COMPLETED -> it.complete
                }
            }
            .filter { q.isEmpty() || it.name.contains(q, ignoreCase = true) || it.category.contains(q, ignoreCase = true) }
            .sortedWith(compareByDescending<TaskEntity> { it.taskDate ?: "" }.then(dayComparator))
            .take(200)
            .toList()
    }

    val DEFAULT_PROJECTS = listOf("Home", "Office", "Personal")

    fun projects(existing: List<String>): List<String> =
        (DEFAULT_PROJECTS + existing).filter { it.isNotBlank() }.distinctBy { it.lowercase() }
}
