using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Consultorio.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceShowDuration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ShowDuration",
                table: "Services",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShowDuration",
                table: "Services");
        }
    }
}
