using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Consultorio.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceExtraFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "OnlineBooking",
                table: "Services",
                type: "bit",
                nullable: false,
                defaultValue: true);

            // Garante que todos os serviços existentes fiquem disponíveis para agendamento online
            migrationBuilder.Sql("UPDATE Services SET OnlineBooking = 1 WHERE OnlineBooking = 0");

            migrationBuilder.AddColumn<string>(
                name: "Preparation",
                table: "Services",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShortDescription",
                table: "Services",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OnlineBooking",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "Preparation",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "ShortDescription",
                table: "Services");
        }
    }
}
