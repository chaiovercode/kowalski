// Filter Panel Component for Interactive Dashboard
// "Let me narrow down the data, Skipper."

import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { THEME, ARROWS, BOX } from "../theme";
import type { DataSet, ColumnStats } from "../types";
import type { DataFilter, NumericFilter, CategoricalFilter } from "../../../ipc/types";

interface FilterPanelProps {
  data: DataSet;
  statistics: Record<string, ColumnStats>;
  activeFilters: DataFilter[];
  onFilterChange: (filters: DataFilter[]) => void;
  onClose: () => void;
  width: number;
  height: number;
}

interface FilterItemProps {
  column: string;
  type: "numeric" | "categorical";
  stats: ColumnStats;
  filter?: DataFilter;
  selected: boolean;
  onUpdate: (filter: DataFilter | null) => void;
  width: number;
}

// Individual filter row
function FilterItem({ column, type, stats, filter, selected, onUpdate, width }: FilterItemProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [inputField, setInputField] = useState<"min" | "max" | "values">("min");

  const bgColor = selected ? THEME.primary : undefined;
  const textColor = selected ? "#000" : THEME.text;

  const getFilterDisplay = () => {
    if (!filter) return "No filter";
    if (filter.type === "numeric") {
      const min = filter.min !== undefined ? filter.min.toFixed(1) : "-inf";
      const max = filter.max !== undefined ? filter.max.toFixed(1) : "+inf";
      return `${min} to ${max}`;
    }
    if (filter.type === "categorical") {
      if (filter.values.length === 0) return "None selected";
      if (filter.values.length <= 2) return filter.values.join(", ");
      return `${filter.values.length} selected`;
    }
    return "Unknown";
  };

  useInput(
    (input, key) => {
      if (!selected) return;

      if (key.return) {
        if (editing) {
          // Apply the edited value
          if (type === "numeric") {
            const numValue = parseFloat(inputValue);
            if (!isNaN(numValue)) {
              const currentFilter = filter as NumericFilter | undefined;
              const newFilter: NumericFilter = {
                type: "numeric",
                column,
                min: inputField === "min" ? numValue : currentFilter?.min,
                max: inputField === "max" ? numValue : currentFilter?.max,
              };
              onUpdate(newFilter);
            }
          }
          setEditing(false);
          setInputValue("");
        } else {
          setEditing(true);
          setInputField("min");
        }
      } else if (key.escape) {
        setEditing(false);
        setInputValue("");
      } else if (key.delete || key.backspace) {
        if (editing) {
          setInputValue((prev) => prev.slice(0, -1));
        } else if (filter) {
          // Clear the filter
          onUpdate(null);
        }
      } else if (key.tab && editing) {
        // Switch between min/max fields
        setInputField((prev) => (prev === "min" ? "max" : "min"));
      } else if (input && editing) {
        setInputValue((prev) => prev + input);
      }
    },
    { isActive: selected }
  );

  return (
    <Box flexDirection="row" width={width}>
      <Box width={2}>
        <Text color={bgColor ? textColor : THEME.textDim}>{selected ? ARROWS.right : " "}</Text>
      </Box>
      <Box width={Math.floor(width * 0.35)}>
        <Text color={textColor} backgroundColor={bgColor}>
          {column.slice(0, Math.floor(width * 0.35) - 1).padEnd(Math.floor(width * 0.35))}
        </Text>
      </Box>
      <Box width={Math.floor(width * 0.15)}>
        <Text color={THEME.textDim}>{type === "numeric" ? "#" : "ABC"}</Text>
      </Box>
      <Box flexGrow={1}>
        {editing ? (
          <Text color={THEME.primary}>
            {inputField === "min" ? "Min: " : "Max: "}
            {inputValue}
            <Text color={THEME.warning}>|</Text>
          </Text>
        ) : (
          <Text color={filter ? THEME.positive : THEME.textDim}>{getFilterDisplay()}</Text>
        )}
      </Box>
    </Box>
  );
}

// Main filter panel
export function FilterPanel({
  data,
  statistics,
  activeFilters,
  onFilterChange,
  onClose,
  width,
  height,
}: FilterPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const columns = data.columns.filter((col) => {
    const stats = statistics[col];
    return stats && (stats.type === "numeric" || stats.type === "categorical");
  });

  const maxVisible = Math.max(1, height - 4);
  const scrollOffset = Math.max(0, selectedIndex - maxVisible + 1);
  const visibleColumns = columns.slice(scrollOffset, scrollOffset + maxVisible);

  const handleFilterUpdate = useCallback(
    (column: string, filter: DataFilter | null) => {
      let newFilters = activeFilters.filter((f) => f.column !== column);
      if (filter) {
        newFilters.push(filter);
      }
      onFilterChange(newFilters);
    },
    [activeFilters, onFilterChange]
  );

  useInput((input, key) => {
    if (key.escape) {
      onClose();
    } else if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(columns.length - 1, prev + 1));
    } else if (input === "c" || input === "C") {
      // Clear all filters
      onFilterChange([]);
    }
  });

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle="single"
      borderColor={THEME.secondary}
    >
      <Box marginBottom={1}>
        <Text color={THEME.secondary} bold>
          {BOX.corner.topLeft} Filter Panel
        </Text>
        <Text color={THEME.textDim}> | ESC: Close | C: Clear All</Text>
      </Box>

      {visibleColumns.map((col, i) => {
        const actualIndex = scrollOffset + i;
        const stats = statistics[col];
        const type = stats.type === "numeric" ? "numeric" : "categorical";
        const filter = activeFilters.find((f) => f.column === col);

        return (
          <FilterItem
            key={col}
            column={col}
            type={type}
            stats={stats}
            filter={filter}
            selected={actualIndex === selectedIndex}
            onUpdate={(f) => handleFilterUpdate(col, f)}
            width={width - 4}
          />
        );
      })}

      {columns.length > maxVisible && (
        <Box marginTop={1}>
          <Text color={THEME.textDim}>
            Showing {scrollOffset + 1}-{Math.min(scrollOffset + maxVisible, columns.length)} of{" "}
            {columns.length}
          </Text>
        </Box>
      )}

      {activeFilters.length > 0 && (
        <Box marginTop={1}>
          <Text color={THEME.positive}>
            {activeFilters.length} active filter{activeFilters.length > 1 ? "s" : ""}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default FilterPanel;
