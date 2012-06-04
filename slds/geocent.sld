<?xml version="1.0" encoding="iso-8859-1"?>
<StyledLayerDescriptor version="1.0.0"
                       xmlns="http://www.opengis.net/sld"
                       xmlns:ogc="http://www.opengis.net/ogc"
                       xmlns:xlink="http://www.w3.org/1999/xlink"
                       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                       xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>geocent</Name>
    <UserStyle>
      <Name>Geocent</Name>
      <Title>The Geocent logo</Title>
      <Abstract>The Geocent logo</Abstract>
      <FeatureTypeStyle>
        <Rule>
          <Title>Geocent</Title>
          <PointSymbolizer>
            <Graphic>
              <ExternalGraphic>
                <OnlineResource xlink:href="opencop/images/geocent_logo_solid.png"
                                xlink:type="simple" />
                <Format>image/png</Format>
              </ExternalGraphic>
              <Size>
                <ogc:Literal>20</ogc:Literal>
              </Size>
            </Graphic>
          </PointSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
