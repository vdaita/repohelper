import { Global } from '@mantine/core';
import regular from './Inter-Regular.ttf'

export function CustomFonts() {
  return (
    <Global
      styles={[
        {
          '@font-face': {
            fontFamily: 'Inter',
            src: `url('${bold}') format("ttf")`,
            fontStyle: 'normal'
          },
        }
      ]}
    />
  );
}
