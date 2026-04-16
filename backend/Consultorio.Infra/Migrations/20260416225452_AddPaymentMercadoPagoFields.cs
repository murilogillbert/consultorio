using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Consultorio.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentMercadoPagoFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExternalCheckoutUrl",
                table: "Payments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalPaymentId",
                table: "Payments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalQrCode",
                table: "Payments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalQrCodeBase64",
                table: "Payments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "PaidBeforeCompletion",
                table: "Payments",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExternalCheckoutUrl",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "ExternalPaymentId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "ExternalQrCode",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "ExternalQrCodeBase64",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "PaidBeforeCompletion",
                table: "Payments");
        }
    }
}
