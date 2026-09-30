# Release builds are not minified; rules kept for when they are.
-keepattributes *Annotation*, InnerClasses
-keep,includedescriptorclasses class com.myapp.todo.**$$serializer { *; }
