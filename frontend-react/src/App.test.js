import { render, screen } from '@testing-library/react';
import App from './App';
import { TaskProvider } from './contexts/TaskContext';

test('renders learn react link', () => {
  render(
    <TaskProvider>
      <App />
    </TaskProvider>
  );
  const linkElement = screen.getByText((content, element) => {
    return element.tagName.toLowerCase() === 'span' && content.includes('Add Task');
  });
  expect(linkElement).toBeInTheDocument();
});
