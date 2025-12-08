package com.myapp.todo;

import java.util.ArrayList;

import jakarta.validation.Valid;

public class TodoListViewModel {

    @Valid
    private ArrayList<TodoItem> todoList = new ArrayList<TodoItem>();

    public TodoListViewModel() {
    }

    public TodoListViewModel(Iterable<TodoItem> items) {
        items.forEach(todoList::add);
    }

    public TodoListViewModel(ArrayList<TodoItem> todoList) {
        this.todoList = todoList == null ? new ArrayList<>() : new ArrayList<>(todoList);
    }

    public ArrayList<TodoItem> getTodoList() {
        return new ArrayList<>(todoList);
    }

    public void setTodoList(ArrayList<TodoItem> todoList) {
        this.todoList = todoList == null ? new ArrayList<>() : new ArrayList<>(todoList);
    }
}