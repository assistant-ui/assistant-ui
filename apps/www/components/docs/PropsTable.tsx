import { AccessibleIcon } from "@radix-ui/react-accessible-icon";
import { DividerHorizontalIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import {
  Box,
  Code,
  Flex,
  IconButton,
  Inset,
  Popover,
  ScrollArea,
  Table,
} from "@radix-ui/themes";
import type React from "react";

export type PropDef = {
  name: string;
  required?: boolean;
  default?: string | boolean;
  type?: string;
  typeSimple: string;
  description?: string | React.ReactNode;
};

export function PropsTable({
  data,
  propHeaderFixedWidth = true,
}: {
  data: PropDef[];
  propHeaderFixedWidth?: boolean;
}) {
  return (
    <Box my="5" asChild>
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell
              style={{ width: propHeaderFixedWidth ? "37%" : "auto" }}
            >
              Prop
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Default</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {data.map(
            (
              {
                name,
                type,
                typeSimple,
                required,
                default: defaultValue,
                description,
              },
              i,
            ) => {
              const key = `${name}-${i}`;
              return (
                <Table.Row key={key} style={{ whiteSpace: "nowrap" }}>
                  <Table.RowHeaderCell>
                    <Flex display="inline-flex" align="center" gap="2">
                      <Box>
                        <Code size="2">
                          {name}
                          {required ? "*" : null}
                        </Code>
                      </Box>
                      {description && (
                        <Popover.Root>
                          <Popover.Trigger>
                            <IconButton variant="ghost" size="1" color="gray">
                              <AccessibleIcon label="Prop description">
                                <InfoCircledIcon />
                              </AccessibleIcon>
                            </IconButton>
                          </Popover.Trigger>
                          <Popover.Content
                            side="top"
                            align="center"
                            style={{ maxWidth: 350 }}
                            className="radix-themes-custom-fonts"
                            onOpenAutoFocus={(event) => {
                              event.preventDefault();
                              (event.currentTarget as HTMLElement)?.focus();
                            }}
                          >
                            <div className="text-sm">{description}</div>
                          </Popover.Content>
                        </Popover.Root>
                      )}
                    </Flex>
                  </Table.RowHeaderCell>
                  <Table.Cell>
                    <Flex display="inline-flex" align="center" gap="2">
                      <Box>
                        <Code color="gray" size="2">
                          {typeSimple ? typeSimple : type}
                        </Code>
                      </Box>
                      {Boolean(typeSimple) && Boolean(type) && (
                        <Popover.Root>
                          <Popover.Trigger>
                            <IconButton variant="ghost" color="gray" size="1">
                              <AccessibleIcon label="See full type">
                                <InfoCircledIcon />
                              </AccessibleIcon>
                            </IconButton>
                          </Popover.Trigger>
                          <Popover.Content
                            side="top"
                            align="center"
                            style={{ maxWidth: "min(1240px, 95vw)" }}
                          >
                            <Inset>
                              <ScrollArea type="auto">
                                <Box
                                  style={{
                                    paddingTop: "var(--inset-padding-top)",
                                    paddingRight: "var(--inset-padding-right)",
                                    paddingBottom:
                                      "var(--inset-padding-bottom)",
                                    paddingLeft: "var(--inset-padding-left)",
                                  }}
                                >
                                  <Code
                                    color="gray"
                                    variant="ghost"
                                    size="2"
                                    style={{
                                      whiteSpace: "pre",
                                      display: "block",
                                    }}
                                  >
                                    {type}
                                  </Code>
                                </Box>
                              </ScrollArea>
                            </Inset>
                          </Popover.Content>
                        </Popover.Root>
                      )}
                    </Flex>
                  </Table.Cell>

                  <Table.Cell>
                    {defaultValue ? (
                      <Code size="2" color="gray">
                        {defaultValue}
                      </Code>
                    ) : (
                      <AccessibleIcon label="No default value">
                        <DividerHorizontalIcon
                          style={{ color: "var(--gray-8)" }}
                        />
                      </AccessibleIcon>
                    )}
                  </Table.Cell>
                </Table.Row>
              );
            },
          )}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
