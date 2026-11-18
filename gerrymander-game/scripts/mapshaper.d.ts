declare module 'mapshaper' {
  const mapshaper: {
    applyCommands(commands: string, inputs: Record<string, string | Buffer>): Promise<Record<string, Buffer | string>>;
  };
  export default mapshaper;
}
