import { Box, Flex, Kbd, Table } from "@radix-ui/themes";
import type React from "react";

type KeyboardDef = {
  keys: string[];
  description: React.ReactNode;
};

export function KeyboardTable({ data }: { data: KeyboardDef[] }) {
  return (
    <Box my="5" asChild>
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell style={{ width: "37%" }}>
              Key
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {data.map(({ keys, description }, i) => {
            const key = `${description}-${i}`;
            return (
              <Table.Row key={key}>
                <Table.Cell>
                  <Flex gap="2">
                    {keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </Flex>
                </Table.Cell>

                <Table.Cell>{description}</Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
