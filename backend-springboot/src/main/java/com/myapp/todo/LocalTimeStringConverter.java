package com.myapp.todo;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.LocalTime;

@Converter
public class LocalTimeStringConverter implements AttributeConverter<LocalTime, String> {

    @Override
    public String convertToDatabaseColumn(LocalTime attribute) {
        return attribute == null ? null : attribute.toString();
    }

    @Override
    public LocalTime convertToEntityAttribute(String databaseValue) {
        return databaseValue == null ? null : LocalTime.parse(databaseValue);
    }
}
