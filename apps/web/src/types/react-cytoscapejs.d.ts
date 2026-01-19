declare module "react-cytoscapejs" {
  interface CytoscapeComponentProps {
    elements: cytoscape.ElementsDefinition | cytoscape.ElementDefinition[];
    layout?: cytoscape.LayoutOptions;
    stylesheet?: cytoscape.Stylesheet[];
    style?: React.CSSProperties;
    cy?: (cy: cytoscape.Core) => void;
    className?: string;
    id?: string;
  }

  const CytoscapeComponent: React.FC<CytoscapeComponentProps>;
  export default CytoscapeComponent;
}
